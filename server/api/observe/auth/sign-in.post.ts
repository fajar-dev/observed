import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { signInSchema } from '#shared/domain/auth'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { validateBody } from '~~/server/http/request-validation'
import { clientIp, writeSession } from '~~/server/http/authentication'

export default defineWorkspaceHandler(async (event) => {
  const input = await validateBody(event, signInSchema)
  return writeSession(event, await getWorkspace().auth.signIn(input.email, input.password, clientIp(event), getHeader(event, 'user-agent') || 'Unknown browser'))
})
