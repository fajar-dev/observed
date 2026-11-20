import { requirePrincipal } from '~~/server/http/authentication'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler(async (event) => {
  const user = requirePrincipal(event).user
  const services = getWorkspace()
  const folders = await services.dashboards.folders()
  if (user.role === 'admin') return folders
  const records = [...await services.permissions.dashboards(user), ...await services.permissions.alerts(user)]
  return folders.filter(folder => records.some(record => record.folder === folder.name))
})
