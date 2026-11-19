import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { auth, oidc } = getWorkspace()
  return auth.configuration(oidc.enabled())
})
