import { z } from 'zod'
import type { AuthUser } from './auth'

export const accessLevelSchema = z.enum(['view', 'edit'])
export const accessScopeSchema = z.enum(['none', 'selected', 'all'])
const resourcePermissionSchema = z.object({
  scope: accessScopeSchema,
  access: accessLevelSchema,
  grants: z.array(z.object({ id: z.uuid(), access: accessLevelSchema })).max(1000)
}).refine(value => new Set(value.grants.map(grant => grant.id)).size === value.grants.length, 'Select each resource once.')
export const userPermissionsSchema = z.object({
  dashboards: resourcePermissionSchema,
  alerts: resourcePermissionSchema
})
export type UserPermissions = z.infer<typeof userPermissionsSchema>
export type ResourceKind = 'dashboards' | 'alerts'
export type AccessLevel = z.infer<typeof accessLevelSchema>

export function defaultPermissions(admin = false): UserPermissions {
  return {
    dashboards: { scope: admin ? 'all' : 'none', access: admin ? 'edit' : 'view', grants: [] },
    alerts: { scope: admin ? 'all' : 'none', access: admin ? 'edit' : 'view', grants: [] }
  }
}
export function effectivePermissions(user: Pick<AuthUser, 'role' | 'permissions'> | null | undefined) {
  return user?.role === 'admin' ? defaultPermissions(true) : user?.permissions ?? defaultPermissions()
}
export function canAccessResource(user: Pick<AuthUser, 'role' | 'permissions'> | null | undefined, kind: ResourceKind, id: string, action: AccessLevel = 'view'): boolean {
  if (user?.role === 'admin') return true
  const permission = effectivePermissions(user)[kind]
  const access = permission.scope === 'none' ? undefined : permission.grants.find(grant => grant.id === id)?.access ?? (permission.scope === 'all' ? permission.access : undefined)
  return !!access && (action === 'view' || (user?.role === 'editor' && access === 'edit'))
}
export function canAccessModule(user: Pick<AuthUser, 'role' | 'permissions'> | null | undefined, kind: ResourceKind | 'notifications') {
  if (kind === 'notifications') return !!user
  const permission = effectivePermissions(user)[kind]
  return canCreateResource(user, kind) || permission.scope === 'all' || (permission.scope === 'selected' && permission.grants.length > 0)
}
export function canCreateResource(user: Pick<AuthUser, 'role' | 'permissions'> | null | undefined, _kind: ResourceKind) {
  return user?.role === 'admin' || user?.role === 'editor'
}
export function canDeleteResource(user: Pick<AuthUser, 'id' | 'role' | 'permissions'> | null | undefined, kind: ResourceKind, resource: { id: string, createdBy?: string }) {
  return user?.role === 'admin' || (!!user && resource.createdBy === user.id && canAccessResource(user, kind, resource.id, 'edit'))
}
