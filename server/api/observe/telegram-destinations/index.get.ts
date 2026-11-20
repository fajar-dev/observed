import { canCreateResource } from '#shared/domain/permissions'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const destinations = await getWorkspace().telegram.list()
  const user = requirePrincipal(event).user
  if (user.role === 'admin') return destinations
  const ids = new Set((await getWorkspace().permissions.alerts(user)).flatMap(rule => rule.telegramDestinationIds))
  return destinations.filter(destination => canCreateResource(user, 'alerts') || ids.has(destination.id)).map(destination => ({ ...destination, chatId: '' }))
})
