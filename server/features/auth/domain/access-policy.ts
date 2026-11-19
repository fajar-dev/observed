import type { Role } from '#shared/domain/auth'

export function isPublicAuthRoute(path: string, method: string) {
  return (method === 'GET' && (path === 'auth/config' || path === 'auth/session' || /^auth\/oauth\/(google|microsoft)(\/callback)?$/.test(path)))
    || (method === 'POST' && ['auth/sign-in', 'auth/setup', 'auth/refresh', 'auth/sign-out'].includes(path))
}

export function isAllowed(role: Role, path: string, method: string) {
  if (path.startsWith('auth/')) return ['auth/me', 'auth/profile', 'auth/providers', 'auth/sessions'].includes(path)
  if (role === 'admin') return true
  if (path === 'users' || path.startsWith('users/')) return false
  if (method === 'GET') return /^(dashboards|dashboard-folders|data-sources|telegram-destinations|alert-rules)(\/|$)/.test(path)
  if (method === 'POST' && (path === 'queries' || path === 'variables/resolve' || /^dashboards\/[^/]+\/diagnostics$/.test(path))) return true
  if (role === 'viewer') return false
  return /^(dashboards|dashboard-folders|dashboard-imports|alert-rules)(\/|$)/.test(path)
}
