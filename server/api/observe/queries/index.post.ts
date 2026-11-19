import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { querySchema } from '#shared/domain/query'

export default defineEventHandler(async event => getWorkspace().dataSources.query(await validateBody(event, querySchema)))
