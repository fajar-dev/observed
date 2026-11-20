import { formatTelegramTestNotification } from '~~/server/features/telegram/application/format-test-notification'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async event => getWorkspace().telegram.send(resourceId(event), formatTelegramTestNotification()).then(() => ({ sent: true })))
