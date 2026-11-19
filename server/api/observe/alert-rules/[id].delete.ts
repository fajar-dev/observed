import { getWorkspace } from '~~/server/core/container'
import { resourceId } from '~~/server/http/validation'

export default defineEventHandler(async event => getWorkspace().alerts.deleteAlert(resourceId(event)))
