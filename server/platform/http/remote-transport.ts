import { WorkspaceError } from '~~/server/domain/workspace-error'

export async function readRemote(url: URL, options: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(12000) })
  } catch {
    throw new WorkspaceError({ statusCode: 502, statusMessage: 'Remote service could not be reached' })
  }
  if (!response.body) {
    if (!response.ok) throw new WorkspaceError({ statusCode: 502, statusMessage: `Remote service returned HTTP ${response.status}` })
    return ''
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let result = ''
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 8 * 1024 * 1024) throw new WorkspaceError({ statusCode: 502, statusMessage: 'Remote response exceeded 8 MB' })
      result += decoder.decode(value, { stream: true })
    }
    result += decoder.decode()
  } finally {
    await reader.cancel().catch(() => {})
  }
  if (!response.ok) {
    let message: string | undefined
    try {
      const body = JSON.parse(result) as { message?: unknown, error?: unknown }
      const detail = body.message ?? body.error
      if (typeof detail === 'string') message = detail.slice(0, 1500)
    } catch {
      // Non-JSON upstream responses still expose their HTTP status.
    }
    throw new WorkspaceError({
      statusCode: 502,
      statusMessage: `Remote service returned HTTP ${response.status}`,
      ...(message ? { data: { message } } : {})
    })
  }
  return result
}
