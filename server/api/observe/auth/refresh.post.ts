import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { clearSessionCookies, refreshCookie, writeSession } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  try {
    return writeSession(event, await getWorkspace().auth.refresh(getCookie(event, refreshCookie) || ''))
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) clearSessionCookies(event)
    throw error
  }
})
