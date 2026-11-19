import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { importSchema } from '#shared/domain/dashboard'

export default defineEventHandler(async event => getWorkspace().dashboards.importDashboard(await validateBody(event, importSchema)))
