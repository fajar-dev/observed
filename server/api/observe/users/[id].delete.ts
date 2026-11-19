import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'
import { resourceId } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async (event) => {
  await getWorkspace().auth.deleteUser(resourceId(event), requirePrincipal(event).user.id)
  return { ok: true }
})
