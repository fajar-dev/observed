import { createError, deleteCookie, getCookie, getHeader, getRequestIP, getRequestURL, setCookie } from 'h3'
import type { H3Event } from 'h3'
import type { AuthProvider, AuthUser } from '#shared/domain/auth'
import type { SessionCredentials } from '~~/server/features/auth/domain/authentication.ports'

const accessCookie = 'observe_access'
export const refreshCookie = 'observe_refresh'
export const oauthCookie = 'observe_oauth'
export function oauthCallbackUrl(event: H3Event, provider: AuthProvider) {
  return getRequestURL(event).origin + `/api/observe/auth/oauth/${provider}/callback`
}
export function cookieOptions(event: H3Event) {
  return { httpOnly: true, secure: getRequestURL(event).protocol === 'https:', sameSite: 'lax' as const }
}
export function clearSessionCookies(event: H3Event) {
  deleteCookie(event, oauthCookie, { ...cookieOptions(event), path: '/api/observe/auth/oauth' })
  deleteCookie(event, accessCookie, { ...cookieOptions(event), path: '/' })
  deleteCookie(event, refreshCookie, { ...cookieOptions(event), path: '/api/observe/auth' })
}
export function writeSession(event: H3Event, session: SessionCredentials) {
  setCookie(event, accessCookie, session.accessToken, { ...cookieOptions(event), path: '/', maxAge: 600 })
  setCookie(event, refreshCookie, session.refreshToken, { ...cookieOptions(event), path: '/api/observe/auth', expires: session.expiresAt })
  return { user: session.user, accessToken: session.accessToken, expiresIn: 600 }
}
export function accessToken(event: H3Event) {
  const authorization = getHeader(event, 'authorization')
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : getCookie(event, accessCookie)
}
export function requirePrincipal(event: H3Event): { user: AuthUser, sessionId: string } {
  if (!event.context.principal) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  return event.context.principal
}
export function clientIp(event: H3Event) {
  return getRequestIP(event) || 'unknown'
}
