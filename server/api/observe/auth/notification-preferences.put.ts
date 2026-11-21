import { notificationPreferencesSchema } from '#shared/domain/auth'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal } from '~~/server/http/authentication'
import { validateBody } from '~~/server/http/request-validation'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'

export default defineWorkspaceHandler(async event => getWorkspace().auth.updateNotificationPreferences(requirePrincipal(event).user.id, await validateBody(event, notificationPreferencesSchema)))
