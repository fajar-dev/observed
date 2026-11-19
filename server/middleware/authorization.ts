import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { accessToken, publicOrigin } from '~~/server/http/authentication'
import { isAllowed, isPublicAuthRoute } from '~~/server/features/auth/domain/access-policy'

export default defineWorkspaceHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/observe/')) return
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const origin = getHeader(event, 'origin')
  const method = getMethod(event)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if ((origin && origin !== publicOrigin(event)) || getHeader(event, 'sec-fetch-site') === 'cross-site') {
      throw createError({ statusCode: 403, statusMessage: 'Request origin is not allowed' })
    }
    const bearer = getHeader(event, 'authorization')?.startsWith('Bearer ')
    // Cookie-authenticated mutations require a same-origin browser signal; CLI clients may use Bearer.
    if (!bearer && !origin && getHeader(event, 'sec-fetch-site') !== 'same-origin') {
      throw createError({ statusCode: 403, statusMessage: 'A same-origin request is required' })
    }
  }
  const path = pathname.slice('/api/observe/'.length).replace(/\/$/, '')
  if (isPublicAuthRoute(path, method)) return
  const token = accessToken(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  const principal = await getWorkspace().auth.authenticate(token)
  if (!isAllowed(principal.user.role, path, method)) throw createError({ statusCode: 403, statusMessage: 'You do not have permission to perform this action' })
  event.context.principal = principal
})
