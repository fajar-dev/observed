import { getWorkspace } from '~~/server/core/container'
import { validateBody } from '~~/server/http/validation'
import { folderSchema } from '#shared/domain/dashboard'

export default defineEventHandler(async event => getWorkspace().dashboards.createFolder(await validateBody(event, folderSchema)))
