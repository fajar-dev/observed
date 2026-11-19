import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { telegramDestinationSchema } from '#shared/domain/telegram-destination'

export default defineEventHandler(async event => getWorkspace().telegram.save(await validateBody(event, telegramDestinationSchema)))
