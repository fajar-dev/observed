import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId, validateBody } from '~~/server/http/request-validation'
import { z } from 'zod'

export default defineWorkspaceHandler(async event => getWorkspace().dashboards.repairDashboard(resourceId(event), await validateBody(event, z.strictObject({ dataSourceId: z.uuid().nullable(), restorePanelOptions: z.boolean().optional() }))))
