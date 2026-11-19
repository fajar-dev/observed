import { getWorkspace } from '~~/server/core/container'
import { resourceId } from '~~/server/http/validation'

export default defineEventHandler(async event => getWorkspace().telegram.send(resourceId(event), 'Observe · Telegram test message').then(() => ({ sent: true })))
