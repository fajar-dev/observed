import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { setupSchema } from '#shared/domain/auth'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { clientIp, writeSession } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const { auth } = getWorkspace()
  await auth.assertSetupOpen()
  const input = await validateBody(event, setupSchema)
  return writeSession(event, await auth.setup(input, clientIp(event), getHeader(event, 'user-agent') || 'Unknown browser'))
})
