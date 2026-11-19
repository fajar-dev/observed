import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { userInputSchema } from '#shared/domain/auth'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'
import { validateBody, resourceId } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async event => getWorkspace().auth.saveUser(await validateBody(event, userInputSchema), requirePrincipal(event).user.id, resourceId(event)))
