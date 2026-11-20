import { sendStream } from 'h3'
import { notificationCursor } from '#shared/domain/notification'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { requirePrincipal, accessToken } from '~~/server/http/authentication'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler((event) => {
  const userId = requirePrincipal(event).user.id
  const query = getQuery(event)
  const parsed = notificationCursor.safeParse(query.after ?? '0')
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid notification cursor' })
  let cursor = query.after === undefined ? undefined : parsed.data
  const token = accessToken(event)!
  const services = getWorkspace()
  const encoder = new TextEncoder()
  let closed = false, running = false, signature = ''
  let controller: ReadableStreamDefaultController<Uint8Array>
  setResponseHeaders(event, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' })
  function stop() {
    if (closed) return
    closed = true
    clearInterval(timer)
    event.node.res.off('close', stop)
    try {
      controller.close()
    } catch { /* Cancellation has already closed the readable. */ }
  }
  const tick = async () => {
    if (closed || running || (controller.desiredSize ?? 0) <= 0) return
    running = true
    try {
      const principal = await services.auth.authenticate(token)
      services.permissions.assertRoute(principal.user, 'notifications/stream', 'GET')
      const update = await services.notifications.update(userId, cursor)
      if (closed) return
      const next = JSON.stringify(update)
      cursor = update.cursor
      controller.enqueue(encoder.encode(next !== signature ? `event: notifications\ndata: ${next}\n\n` : ': heartbeat\n\n'))
      signature = next
    } catch {
      stop()
    } finally { running = false }
  }
  const stream = new ReadableStream<Uint8Array>({
    start(value) { controller = value },
    cancel() { stop() }
  })
  event.node.res.on('close', stop)
  const timer = setInterval(() => {
    void tick()
  }, 2000)
  void tick()
  return sendStream(event, stream).catch((error: unknown) => {
    stop()
    if ((error as { name?: string }).name !== 'AbortError') throw error
  })
})
