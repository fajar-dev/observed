import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import type { AuthProvider } from '#shared/domain/auth'
import { accessToken, clientIp, cookieOptions, oauthCookie, publicOrigin } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const provider = getRouterParam(event, 'provider') as AuthProvider
  if (!['google', 'microsoft'].includes(provider)) throw createError({ statusCode: 404 })
  const { auth, oidc, vault } = getWorkspace()
  await auth.checkOAuthLimit(clientIp(event))
  const linking = getQuery(event).link === '1'
  const principal = linking ? await auth.authenticate(accessToken(event) || '') : undefined
  const { flow, url } = await oidc.start(provider, publicOrigin(event) + `/api/observe/auth/oauth/${provider}/callback`, principal ? { userId: principal.user.id, sessionId: principal.sessionId } : undefined)
  setCookie(event, oauthCookie, vault.encrypt(JSON.stringify(flow)), { ...cookieOptions(event), path: '/api/observe/auth/oauth', maxAge: 600 })
  return sendRedirect(event, url)
})
