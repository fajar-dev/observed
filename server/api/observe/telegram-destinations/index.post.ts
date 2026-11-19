import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { telegramDestinationSchema } from '#shared/domain/telegram-destination'

export default defineWorkspaceHandler(async event => getWorkspace().telegram.save(await validateBody(event, telegramDestinationSchema)))
