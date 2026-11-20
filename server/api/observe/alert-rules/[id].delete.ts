import { requirePrincipal } from '~~/server/http/authentication'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async (event) => {
  const id = resourceId(event)
  await getWorkspace().permissions.assertDelete(requirePrincipal(event).user, 'alerts', id)
  return getWorkspace().alerts.deleteAlert(id)
})
