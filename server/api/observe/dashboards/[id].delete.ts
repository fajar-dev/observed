import { getWorkspace } from '~~/server/core/container'
import { resourceId } from '~~/server/http/validation'

export default defineEventHandler(async event => getWorkspace().dashboards.delete(resourceId(event)))
