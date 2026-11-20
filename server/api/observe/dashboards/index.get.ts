import { requirePrincipal } from '~~/server/http/authentication'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler(event => getWorkspace().permissions.dashboards(requirePrincipal(event).user))
