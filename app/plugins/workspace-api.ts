import { WorkspaceApi } from '~/core/http/workspace-api'

export default defineNuxtPlugin(() => ({ provide: { workspaceApi: new WorkspaceApi($fetch) } }))
