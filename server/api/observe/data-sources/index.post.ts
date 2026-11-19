import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { dataSourceSchema } from '#shared/domain/data-source'

export default defineWorkspaceHandler(async event => getWorkspace().dataSources.saveSource(await validateBody(event, dataSourceSchema)))
