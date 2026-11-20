import { product } from '#shared/config/product'
import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { resourceId } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async event => getWorkspace().telegram.send(resourceId(event), `${product.name} · Telegram connection test. Sensor alert notifications will be delivered to this chat.`).then(() => ({ sent: true })))
