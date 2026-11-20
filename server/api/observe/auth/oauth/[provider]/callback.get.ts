import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import type { AuthProvider } from '#shared/domain/auth'
import type { OAuthFlow } from '~~/server/features/auth/domain/authentication.ports'
import { cookieOptions, oauthCallbackUrl, oauthCookie, writeSession } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const provider = getRouterParam(event, 'provider') as AuthProvider
  if (!['google', 'microsoft'].includes(provider)) throw createError({ statusCode: 404 })
  const stored = getCookie(event, oauthCookie)
  deleteCookie(event, oauthCookie, { ...cookieOptions(event), path: '/api/observe/auth/oauth' })
  let linking = false
  try {
    if (!stored) throw new Error('Missing sign-in state')
    const { auth, oidc, vault } = getWorkspace()
    const flow = JSON.parse(vault.decrypt(stored)) as OAuthFlow
    linking = !!flow.linkUserId
    if (flow.linkUserId && (!flow.linkSessionId || !await auth.sessionUser(flow.linkUserId, flow.linkSessionId))) throw new Error('Linking session expired')
    const callback = oauthCallbackUrl(event, provider)
    const url = new URL(callback)
    url.search = getRequestURL(event).search
    const identity = await oidc.finish(provider, url, flow, callback)
    const user = await auth.oauthUser(provider, identity.subject, identity.email, identity.name, flow.linkUserId)
    if (flow.linkUserId) return sendRedirect(event, '/profile?linked=1')
    writeSession(event, await auth.createSession(user.id, getHeader(event, 'user-agent') || 'Unknown browser'))
    return sendRedirect(event, '/')
  } catch {
    return sendRedirect(event, linking ? '/profile?error=oauth' : '/sign-in?error=oauth')
  }
})
