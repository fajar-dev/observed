import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { importSchema } from '#shared/domain/dashboard'

export default defineWorkspaceHandler(async event => getWorkspace().dashboards.importDashboard(await validateBody(event, importSchema)))
