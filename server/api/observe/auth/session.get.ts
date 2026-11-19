import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { accessToken, refreshCookie } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const token = accessToken(event)
  if (token) {
    try {
      const principal = await getWorkspace().auth.authenticate(token)
      return { user: principal.user, canRefresh: true }
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 401) throw error
    }
  }
  return { user: null, canRefresh: Boolean(getCookie(event, refreshCookie)) }
})
