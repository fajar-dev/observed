import { getWorkspace } from '~~/server/core/container'
import { resourceId, validateBody } from '~~/server/http/validation'
import { z } from 'zod'

export default defineEventHandler(async event => getWorkspace().dashboards.repairDashboard(resourceId(event), await validateBody(event, z.strictObject({ dataSourceId: z.uuid().nullable(), restorePanelOptions: z.boolean().optional() }))))
