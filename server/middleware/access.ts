import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (value: string) => createHash('sha256').update(value).digest()

export default defineEventHandler((event) => {
  if (!getRequestURL(event).pathname.startsWith('/api/observe/')) return

  setResponseHeader(event, 'Cache-Control', 'no-store')
  const origin = getHeader(event, 'origin')
  const method = getMethod(event)
  // Browser cross-site requests must not be able to mutate an authenticated workspace.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && origin) {
    const expected = process.env.OBSERVE_ORIGIN || getRequestURL(event).origin
    if (origin !== expected) throw createError({ statusCode: 403, statusMessage: 'Request origin is not allowed' })
  }

  const password = process.env.OBSERVE_AUTH_PASSWORD
  if (!password) {
    if (import.meta.dev || process.env.OBSERVE_TRUST_PROXY_AUTH === 'true') return
    throw createError({ statusCode: 503, statusMessage: 'Configure OBSERVE_AUTH_PASSWORD or trusted proxy authentication' })
  }

  const authorization = getHeader(event, 'authorization') ?? ''
  const credentials = authorization.startsWith('Basic ') ? Buffer.from(authorization.slice(6), 'base64').toString() : ''
  const expected = `${process.env.OBSERVE_AUTH_USER || 'admin'}:${password}`
  if (!timingSafeEqual(digest(credentials), digest(expected))) {
    setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="Observe", charset="UTF-8"')
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
})
