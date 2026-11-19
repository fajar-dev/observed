import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId, validateBody } from '~~/server/http/request-validation'
import { alertRuleSchema } from '#shared/domain/alert-rule'

export default defineWorkspaceHandler(async event => getWorkspace().alerts.saveAlert(await validateBody(event, alertRuleSchema), resourceId(event)))
