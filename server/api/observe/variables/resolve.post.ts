import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { variableResolutionSchema } from '#shared/domain/variable'

export default defineWorkspaceHandler(async event => getWorkspace().dashboards.resolveVariables(await validateBody(event, variableResolutionSchema)))
