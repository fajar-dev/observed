import { getWorkspace } from '~~/server/core/container'
import { resourceId, validateBody } from '~~/server/http/validation'
import { dataSourceSchema } from '#shared/domain/data-source'

export default defineEventHandler(async event => getWorkspace().dataSources.saveSource(await validateBody(event, dataSourceSchema), resourceId(event)))
