import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { profileSchema } from '#shared/domain/auth'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal, clearSessionCookies } from '~~/server/http/authentication'
import { validateBody } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async (event) => {
  const input = await validateBody(event, profileSchema)
  const user = await getWorkspace().auth.updateProfile(requirePrincipal(event).user.id, input)
  if (input.password) clearSessionCookies(event)
  return user
})
