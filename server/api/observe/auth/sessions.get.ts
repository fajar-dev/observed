import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'

export default defineWorkspaceHandler((event) => {
  const { user, sessionId } = requirePrincipal(event)
  return getWorkspace().auth.listSessions(user.id, sessionId)
})
