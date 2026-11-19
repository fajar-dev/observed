import { getWorkspace } from '~~/server/core/container'
import { resourceId, validateBody } from '~~/server/http/validation'
import { dashboardSchema } from '#shared/domain/dashboard'

export default defineEventHandler(async event => getWorkspace().dashboards.saveDashboard(await validateBody(event, dashboardSchema), resourceId(event)))
