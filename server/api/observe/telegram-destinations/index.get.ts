import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const destinations = await getWorkspace().telegram.list()
  return requirePrincipal(event).user.role === 'admin' ? destinations : destinations.map(destination => ({ ...destination, chatId: '' }))
})
