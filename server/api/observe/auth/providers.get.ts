import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'

export default defineWorkspaceHandler(event => getWorkspace().auth.linkedProviders(requirePrincipal(event).user.id))
