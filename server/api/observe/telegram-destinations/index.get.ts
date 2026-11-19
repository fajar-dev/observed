import { getWorkspace } from '~~/server/core/container'

export default defineEventHandler(async () => getWorkspace().telegram.list())
