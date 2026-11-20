import type { AuthUser } from '#shared/domain/auth'
import type { AccessLevel, ResourceKind, UserPermissions } from '#shared/domain/permissions'
import { canAccessModule, canAccessResource, canDeleteResource, canCreateResource, defaultPermissions, effectivePermissions } from '#shared/domain/permissions'
import { WorkspaceError } from '~~/server/domain/workspace-error'
import type { WorkspaceRepository } from '~~/server/domain/ports'
import type { PermissionRepository } from '../domain/permission.repository'

const forbidden = () => new WorkspaceError({ statusCode: 403, statusMessage: 'You do not have permission to access this resource' })

export class PermissionService {
  constructor(private readonly permissions: PermissionRepository, private readonly records: WorkspaceRepository) {}

  async forUser(user: AuthUser) { return user.role === 'admin' ? defaultPermissions(true) : (await this.permissions.get(user.id)).permissions }
  async get(userId: string) { return (await this.permissions.get(userId)).permissions }
  async save(userId: string, input: UserPermissions) {
    const dashboards = input.dashboards.scope !== 'none' ? input.dashboards.grants.map(grant => grant.id) : []
    const alerts = input.alerts.scope !== 'none' ? input.alerts.grants.map(grant => grant.id) : []
    const [availableDashboards, availableAlerts] = await Promise.all([this.records.list('dashboards', dashboards), this.records.list('alertRules', alerts)])
    if (dashboards.some(id => !availableDashboards.some(item => item.id === id)) || alerts.some(id => !availableAlerts.some(item => item.id === id))) {
      throw new WorkspaceError({ statusCode: 422, statusMessage: 'One or more selected resources no longer exist. Refresh and try again.' })
    }
    await this.permissions.save(userId, input)
    return this.get(userId)
  }

  assertResource(user: AuthUser, kind: ResourceKind, id: string, access: AccessLevel = 'view') {
    if (!canAccessResource(user, kind, id, access)) throw forbidden()
  }

  assertRoute(user: AuthUser, path: string, method: string) {
    if (user.role === 'admin' || path.startsWith('auth/') || path.startsWith('users')) return
    if (path === 'notifications' || path.startsWith('notifications/')) {
      if (!canAccessModule(user, 'notifications')) throw forbidden()
      return
    }
    if (path === 'alert-rules/preview') {
      if (!canCreateResource(user, 'alerts')) throw forbidden()
      return
    }
    const match = /^(dashboards|alert-rules)\/([^/]+)(?:\/(.+))?$/.exec(path)
    if (match) {
      const kind = match[1] === 'dashboards' ? 'dashboards' : 'alerts'
      this.assertResource(user, kind, match[2]!, method === 'GET' || match[3] === 'diagnostics' ? 'view' : 'edit')
      return
    }
    if (method === 'GET') return // Collection controllers return only authorized records.
    if (path === 'dashboards' || path.startsWith('dashboard-imports/')) {
      if (!canCreateResource(user, 'dashboards')) throw forbidden()
    } else if (path === 'alert-rules') {
      if (!canCreateResource(user, 'alerts')) throw forbidden()
    } else if (path.startsWith('dashboard-folders')) {
      throw forbidden() // Folder administration is restricted to administrators.
    }
  }

  private resourceIds(user: AuthUser, kind: ResourceKind) {
    const permission = effectivePermissions(user)[kind]
    return permission.scope === 'all' ? undefined : permission.scope === 'selected' ? permission.grants.map(grant => grant.id) : []
  }

  async dashboards(user: AuthUser) { return (await this.records.list('dashboards', this.resourceIds(user, 'dashboards'))).filter(item => canAccessResource(user, 'dashboards', item.id)) }
  async alerts(user: AuthUser) { return (await this.records.list('alertRules', this.resourceIds(user, 'alerts'))).filter(item => canAccessResource(user, 'alerts', item.id)) }

  async assertDelete(user: AuthUser, kind: ResourceKind, id: string) {
    this.assertResource(user, kind, id, 'edit')
    const resource = await this.records.get(kind === 'dashboards' ? 'dashboards' : 'alertRules', id)
    if (!canDeleteResource(user, kind, resource)) throw forbidden()
  }
}
