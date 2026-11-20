import type { Role } from '#shared/domain/auth'
import type { UserPermissions } from '#shared/domain/permissions'

export interface PermissionRepository {
  get(userId: string): Promise<{ role: Role, permissions: UserPermissions }>
  save(userId: string, permissions: UserPermissions): Promise<void>
}
