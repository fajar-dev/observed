import { getWorkspace } from '~~/server/core/container'

export default defineEventHandler(async () => getWorkspace().dashboards.list())
