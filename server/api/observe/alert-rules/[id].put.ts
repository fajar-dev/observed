import { getWorkspace } from '~~/server/core/container'
import { resourceId, validateBody } from '~~/server/http/validation'
import { alertRuleSchema } from '#shared/domain/alert-rule'

export default defineEventHandler(async event => getWorkspace().alerts.saveAlert(await validateBody(event, alertRuleSchema), resourceId(event)))
