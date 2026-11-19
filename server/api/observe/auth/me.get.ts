import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { requirePrincipal } from '~~/server/http/authentication'

export default defineWorkspaceHandler(event => requirePrincipal(event).user)
