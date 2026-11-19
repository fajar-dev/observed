import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { alertPreviewSchema } from '#shared/domain/alert-rule'

export default defineEventHandler(async event => getWorkspace().alerts.previewAlert(await validateBody(event, alertPreviewSchema)))
