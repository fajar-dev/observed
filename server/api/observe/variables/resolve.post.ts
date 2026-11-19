import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { variableResolutionSchema } from '#shared/domain/variable'

export default defineEventHandler(async event => getWorkspace().dashboards.resolveVariables(await validateBody(event, variableResolutionSchema)))
