import type { NotificationUpdate } from '#shared/domain/notification'
import type { WorkspaceApi } from '~/core/http/workspace-api'

/** Resumable authenticated SSE, with a JSON fallback when streaming is unavailable. */
export class NotificationStream {
  private cursor: string | undefined
  constructor(private readonly api: WorkspaceApi, private readonly receive: (update: NotificationUpdate) => void) {}

  private accept(value: NotificationUpdate) {
    if (!value || !Array.isArray(value.items) || !Array.isArray(value.events)) return
    this.cursor = value.cursor
    this.receive(value)
  }

  async run(signal: AbortSignal) {
    while (!signal.aborted) {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
      const suffix = () => this.cursor === undefined ? '' : '?after=' + encodeURIComponent(this.cursor)
      try {
        const stream = await this.api.request<ReadableStream<Uint8Array>>('notifications/stream' + suffix(), { responseType: 'stream', signal })
        if (!stream || typeof stream.getReader !== 'function') return
        reader = stream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (!signal.aborted) {
          const { value, done } = await reader.read()
          if (done) break
          buffer = (buffer + decoder.decode(value, { stream: true })).replaceAll('\r\n', '\n')
          let boundary: number
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            if (!frame.split('\n').includes('event: notifications')) continue
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            if (data) this.accept(JSON.parse(data))
          }
        }
      } catch {
        // Session renewal is handled by the shared API client, including stream reconnects.
      } finally {
        await reader?.cancel().catch(() => {})
      }
      if (signal.aborted) return
      try {
        this.accept(await this.api.request<NotificationUpdate>('notifications' + suffix(), { signal }))
      } catch { /* Retry after a temporary outage. */ }
      if (signal.aborted) return
      await new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', finish)
          resolve()
        }
        const timer = setTimeout(finish, 3000)
        signal.addEventListener('abort', finish, { once: true })
      })
    }
  }
}
