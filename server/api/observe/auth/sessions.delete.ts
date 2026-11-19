import { defineWorkspaceHandler } from '~~/server/http/workspace-handler'
import { z } from 'zod'
import { getWorkspace } from '~~/server/bootstrap/workspace'
import { requirePrincipal, clearSessionCookies } from '~~/server/http/authentication'
import { validateBody } from '~~/server/http/request-validation'

export default defineWorkspaceHandler(async (event) => {
  const { id } = await validateBody(event, z.object({ id: z.uuid().optional() }))
  const { user, sessionId } = requirePrincipal(event)
  await getWorkspace().auth.revokeSession(user.id, id)
  if (!id || id === sessionId) clearSessionCookies(event)
  return { ok: true }
})
