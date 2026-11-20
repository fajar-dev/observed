import { userPermissionsSchema } from '#shared/domain/permissions'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId, validateBody } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async event => getWorkspace().permissions.save(resourceId(event), await validateBody(event, userPermissionsSchema)))
