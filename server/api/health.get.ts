import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    const result = await getWorkspace().health.check()
    if (result.status !== 'ok') setResponseStatus(event, 503)
    return result
  } catch {
    setResponseStatus(event, 503)
    return { status: 'unavailable' }
  }
})
