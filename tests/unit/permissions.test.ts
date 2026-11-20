import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { AuthUser } from '#shared/domain/auth'
import { canAccessModule, canAccessResource, canCreateResource, canDeleteResource, defaultPermissions, userPermissionsSchema } from '#shared/domain/permissions'
import { PermissionService } from '~~/server/features/permissions/application/permission.service'
import type { WorkspaceRepository } from '~~/server/domain/ports'

const dashboardId = randomUUID(), otherId = randomUUID(), alertId = randomUUID()
const policy = defaultPermissions()
policy.dashboards = { scope: 'selected', access: 'view', grants: [{ id: dashboardId, access: 'edit' }] }
const editor = { id: randomUUID(), role: 'editor', permissions: policy } as AuthUser

test('resource permissions deny unassigned users and cap edit grants by role', () => {
  const viewer = { ...editor, role: 'viewer' as const }
  assert.ok(canAccessResource(editor, 'dashboards', dashboardId, 'edit'))
  assert.ok(canAccessResource(viewer, 'dashboards', dashboardId))
  assert.equal(canAccessResource(viewer, 'dashboards', dashboardId, 'edit'), false)
  assert.equal(canAccessResource(editor, 'dashboards', otherId), false)
  assert.equal(canCreateResource(editor, 'dashboards'), true)
  assert.equal(canAccessModule(editor, 'alerts'), true)
  assert.equal(canAccessModule(editor, 'notifications'), true)
  const withAlert = { ...editor, permissions: { ...policy, alerts: { scope: 'selected' as const, access: 'view' as const, grants: [{ id: alertId, access: 'view' as const }] } } }
  assert.ok(canAccessModule(withAlert, 'notifications'), 'View access to an alert automatically enables in-app notifications')
  assert.equal(canAccessResource(withAlert, 'alerts', otherId), false)
  const forged = userPermissionsSchema.parse({ ...defaultPermissions(), notifications: { scope: 'all', ids: [] } })
  assert.equal(canAccessResource({ ...editor, permissions: forged }, 'alerts', alertId), false, 'Inbox availability must not bypass alert permissions')
  assert.equal(canAccessModule(null, 'notifications'), false)
  assert.equal(canAccessResource({ ...editor, permissions: undefined }, 'dashboards', dashboardId), false)
  assert.ok(canAccessResource({ ...editor, role: 'admin', permissions: undefined }, 'alerts', otherId, 'edit'))
  assert.equal(userPermissionsSchema.safeParse({ ...policy, dashboards: { ...policy.dashboards, grants: [policy.dashboards.grants[0], policy.dashboards.grants[0]] } }).success, false)
})

test('API decisions protect hidden resources, mutation actions, import and notification access', () => {
  const service = new PermissionService({} as never, {} as never)
  service.assertRoute(editor, 'dashboards/' + dashboardId, 'PUT')
  service.assertRoute(editor, 'dashboards/' + dashboardId + '/versions', 'GET')
  assert.throws(() => service.assertRoute(editor, 'dashboards/' + otherId, 'GET'))
  service.assertRoute(editor, 'dashboards', 'POST')
  service.assertRoute(editor, 'dashboard-imports/preview', 'POST')
  service.assertRoute(editor, 'alert-rules/preview', 'POST')
  assert.throws(() => service.assertRoute(editor, 'dashboard-folders', 'POST'))
  assert.throws(() => service.assertRoute({ ...editor, role: 'viewer' }, 'dashboards/' + dashboardId, 'DELETE'))
  service.assertRoute({ ...editor, permissions: defaultPermissions() }, 'notifications/stream', 'GET')
  service.assertRoute({ ...editor, role: 'viewer', permissions: defaultPermissions() }, 'notifications', 'GET')
})

test('resource permissions do not contain a data-source ACL or restrict authenticated queries', () => {
  assert.deepEqual(Object.keys(userPermissionsSchema.parse({ ...defaultPermissions(), dataSources: { scope: 'none', ids: [] } })), ['dashboards', 'alerts'])
  const service = new PermissionService({} as never, {} as WorkspaceRepository)
  for (const role of ['admin', 'editor', 'viewer'] as const) {
    const user = { ...editor, role, permissions: defaultPermissions() }
    service.assertRoute(user, 'data-sources', 'GET')
    service.assertRoute(user, 'queries', 'POST')
    service.assertRoute(user, 'variables/resolve', 'POST')
  }
})

test('Editors create independently of existing grants; deletion still requires ownership and Edit', async () => {
  const empty = { ...editor, permissions: defaultPermissions() }
  assert.ok(canCreateResource(empty, 'dashboards'))
  assert.ok(canCreateResource(empty, 'alerts'))
  assert.ok(canAccessModule(empty, 'dashboards'))
  assert.equal(canAccessResource(empty, 'dashboards', dashboardId), false)
  assert.equal(canAccessModule(empty, 'notifications'), true)
  const mixed = { ...editor, permissions: { ...policy, dashboards: { ...policy.dashboards, scope: 'all' as const } } }
  assert.ok(canAccessResource(mixed, 'dashboards', dashboardId, 'edit'), 'Individual Edit overrides All View for the creator')
  assert.equal(canAccessResource(mixed, 'dashboards', otherId, 'edit'), false)
  assert.ok(canDeleteResource(editor, 'dashboards', { id: dashboardId, createdBy: editor.id }))
  assert.equal(canDeleteResource(editor, 'dashboards', { id: dashboardId, createdBy: otherId }), false)
  assert.equal(canDeleteResource(empty, 'dashboards', { id: dashboardId, createdBy: editor.id }), false, 'Ownership cannot bypass revoked Edit access')
})
