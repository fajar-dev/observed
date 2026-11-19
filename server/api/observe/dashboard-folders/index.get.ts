import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler(async () => getWorkspace().dashboards.folders())
