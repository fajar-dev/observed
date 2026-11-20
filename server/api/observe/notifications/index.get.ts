import { notificationCursor } from '#shared/domain/notification'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { requirePrincipal } from '~~/server/http/authentication'
import { getWorkspace } from '~~/server/bootstrap/workspace'

export default defineWorkspaceHandler((event) => {
  const after = getQuery(event).after
  const parsed = notificationCursor.safeParse(after ?? '0')
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid notification cursor' })
  return getWorkspace().notifications.update(requirePrincipal(event).user.id, after === undefined ? undefined : parsed.data)
})
