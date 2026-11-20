import { notificationReadSchema } from '#shared/domain/notification'
import { validateBody } from '~~/server/http/request-validation'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { requirePrincipal } from '~~/server/http/authentication'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler(async (event) => {
  await getWorkspace().notifications.markRead(requirePrincipal(event).user.id, await validateBody(event, notificationReadSchema))
  return { saved: true }
})
