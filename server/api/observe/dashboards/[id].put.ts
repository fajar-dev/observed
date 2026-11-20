import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId, validateBody } from '~~/server/http/request-validation'
import { dashboardSchema } from '#shared/domain/dashboard'

export default defineWorkspaceHandler(async (event) => {
  const input = await validateBody(event, dashboardSchema)
  return getWorkspace().dashboards.saveDashboard(input, resourceId(event))
})
