import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { accessToken, clearSessionCookies, refreshCookie } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const { auth } = getWorkspace()
  try {
    await auth.signOut(getCookie(event, refreshCookie))
    const token = accessToken(event)
    if (token) {
      const principal = await auth.authenticate(token).catch(() => undefined)
      if (principal) await auth.revokeSession(principal.user.id, principal.sessionId)
    }
  } finally { clearSessionCookies(event) }
  return { ok: true }
})
