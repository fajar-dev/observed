import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { alertPreviewSchema } from '#shared/domain/alert-rule'

export default defineWorkspaceHandler(async (event) => {
  const input = await validateBody(event, alertPreviewSchema)
  return getWorkspace().alerts.previewAlert(input)
})
