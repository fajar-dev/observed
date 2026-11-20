import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { accessToken } from '~~/server/http/authentication'
import { assertMutationRequest } from '~~/server/http/request-security'
import { isAllowed, isPublicAuthRoute } from '~~/server/features/auth/domain/access-policy'

export default defineWorkspaceHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/observe/')) return
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const method = getMethod(event)
  assertMutationRequest(event)
  const path = pathname.slice('/api/observe/'.length).replace(/\/$/, '')
  if (isPublicAuthRoute(path, method)) return
  const token = accessToken(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  const principal = await getWorkspace().auth.authenticate(token)
  if (!isAllowed(principal.user.role, path, method)) throw createError({ statusCode: 403, statusMessage: 'You do not have permission to perform this action' })
  getWorkspace().permissions.assertRoute(principal.user, path, method)
  event.context.principal = principal
})
