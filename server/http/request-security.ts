import { createError, getHeader, getMethod, getRequestURL } from 'h3'
import type { H3Event } from 'h3'

/** Cookie mutations must come from the current request's own site. */
export function assertMutationRequest(event: H3Event) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(getMethod(event))) return
  const origin = getHeader(event, 'origin')
  const site = getHeader(event, 'sec-fetch-site')
  if (site === 'cross-site' || (origin && origin !== getRequestURL(event).origin)) {
    throw createError({ statusCode: 403, statusMessage: 'Request origin is not allowed' })
  }
  if (!getHeader(event, 'authorization')?.startsWith('Bearer ') && !origin && site !== 'same-origin') {
    throw createError({ statusCode: 403, statusMessage: 'A same-origin request is required' })
  }
}
