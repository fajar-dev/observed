import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(event => getWorkspace().permissions.get(resourceId(event)))
