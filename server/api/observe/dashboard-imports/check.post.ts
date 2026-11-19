import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { dashboardSchema } from '#shared/domain/dashboard'

export default defineEventHandler(async event => getWorkspace().dashboards.diagnoseDashboard(await validateBody(event, dashboardSchema)))
