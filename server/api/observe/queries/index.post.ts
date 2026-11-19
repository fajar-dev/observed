import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { querySchema } from '#shared/domain/query'

export default defineWorkspaceHandler(async event => getWorkspace().dataSources.query(await validateBody(event, querySchema)))
