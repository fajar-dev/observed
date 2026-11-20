import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { PostgresDatabase } from '~~/server/platform/database/database'
import { PostgresWorkspaceRepository } from '~~/server/platform/database/workspace.repository'
import { PostgresPermissionRepository } from '~~/server/features/permissions/infrastructure/permission.repository'
import { PostgresNotificationRepository } from '~~/server/features/notifications/infrastructure/notification.repository'
import { defaultPermissions, canAccessResource, canDeleteResource } from '#shared/domain/permissions'

const connection = process.env.TEST_DATABASE_URL
if (!connection || !new URL(connection).pathname.endsWith('_test')) throw new Error('Use an isolated TEST_DATABASE_URL ending in _test')

test('PostgreSQL permissions derive notifications from alert grants and enforce resource scopes, reads, revocation and migration', async () => {
  const pool = new pg.Pool({ connectionString: connection })
  const database = new PostgresDatabase(connection!)
  try {
    await pool.query('DROP SCHEMA IF EXISTS observe CASCADE')
    await database.ready()
    const adminId = randomUUID(), editorId = randomUUID(), viewerId = randomUUID()
    for (const [id, role] of [[adminId, 'admin'], [editorId, 'editor'], [viewerId, 'viewer']]) await pool.query('INSERT INTO observe.users(id,email,name,role,enabled) VALUES($1,$2,$3,$3,true)', [id, id + '@example.test', role])
    const permissions = new PostgresPermissionRepository(database)
    assert.deepEqual((await permissions.get(editorId)).permissions, defaultPermissions())
    assert.equal((await permissions.get(adminId)).permissions.dashboards.scope, 'all')
    const records = new PostgresWorkspaceRepository(database)
    const source = await records.create('dataSources', { name: 'Bridge sensors', url: 'http://influx.test', queryLanguage: 'flux', organization: 'sensors', database: 'bridge', username: '' })
    const dashboard = await records.create('dashboards', { name: 'Bridge', range: '1h', refresh: 0, description: '', panels: [] })
    const rule = await records.create('alertRules', { name: 'Tilt', dataSourceId: source.id, query: 'tilt', range: '1h', interval: 60, enabled: true, telegramDestinationIds: [], operator: 'gt', reducer: 'last', field: '_value', threshold: 0.5 })
    const otherRule = await records.create('alertRules', { ...rule, name: 'Private tilt' })
    // Creation and creator permissions commit together, including All View overrides.
    const ownDashboard = await records.create('dashboards', { name: 'Editor bridge', range: '1h', refresh: 0, description: '', panels: [] }, editorId)
    assert.equal(ownDashboard.createdBy, editorId)
    assert.equal((await records.get('dashboards', ownDashboard.id)).createdBy, editorId)
    let creator = { id: editorId, role: 'editor' as const, permissions: (await permissions.get(editorId)).permissions }
    assert.ok(canAccessResource(creator, 'dashboards', ownDashboard.id, 'edit'))
    assert.equal(canAccessResource(creator, 'dashboards', dashboard.id), false)
    assert.ok(canDeleteResource(creator, 'dashboards', ownDashboard))
    const allView = defaultPermissions()
    allView.dashboards = { scope: 'all', access: 'view', grants: [] }
    await permissions.save(editorId, allView)
    const secondOwn = await records.create('dashboards', { name: 'Second editor bridge', range: '1h', refresh: 0, description: '', panels: [] }, editorId)
    creator = { ...creator, permissions: (await permissions.get(editorId)).permissions }
    assert.ok(canAccessResource(creator, 'dashboards', secondOwn.id, 'edit'))
    assert.equal(canAccessResource(creator, 'dashboards', ownDashboard.id, 'edit'), false)
    await permissions.save(editorId, creator.permissions)
    assert.ok(canAccessResource({ ...creator, permissions: (await permissions.get(editorId)).permissions }, 'dashboards', secondOwn.id, 'edit'), 'Saving All View preserves individual Edit overrides')
    await permissions.save(editorId, defaultPermissions())
    assert.equal(canDeleteResource({ ...creator, permissions: (await permissions.get(editorId)).permissions }, 'dashboards', secondOwn), false)
    await assert.rejects(records.create('dashboards', { name: 'Forbidden viewer resource', range: '1h', refresh: 0, description: '', panels: [] }, viewerId), /Only administrators and editors/)
    assert.equal((await records.list('dashboards')).some(item => item.name === 'Forbidden viewer resource'), false)
    const policy = defaultPermissions()
    policy.dashboards = { scope: 'selected', access: 'view', grants: [{ id: dashboard.id, access: 'edit' }] }
    policy.alerts = { scope: 'selected', access: 'view', grants: [{ id: rule.id, access: 'view' }] }
    const sessionId = randomUUID()
    await pool.query('INSERT INTO observe.auth_sessions(id,user_id,expires_at,user_agent) VALUES($1,$2,now()+interval \'1 day\',\'test\')', [sessionId, editorId])
    await permissions.save(editorId, policy)
    assert.ok((await pool.query('SELECT revoked_at FROM observe.auth_sessions WHERE id=$1', [sessionId])).rows[0].revoked_at)
    assert.deepEqual((await permissions.get(editorId)).permissions, policy)
    const secondSession = randomUUID()
    await pool.query('INSERT INTO observe.auth_sessions(id,user_id,expires_at,user_agent) VALUES($1,$2,now()+interval \'1 day\',\'test\')', [secondSession, editorId])
    await assert.rejects(permissions.save(editorId, { ...policy, dashboards: { ...policy.dashboards, grants: [{ id: randomUUID(), access: 'view' }] } }))
    assert.deepEqual((await permissions.get(editorId)).permissions, policy, 'A failed grant update must preserve the previous policy')
    assert.equal((await pool.query('SELECT revoked_at FROM observe.auth_sessions WHERE id=$1', [secondSession])).rows[0].revoked_at, null)
    await permissions.save(viewerId, policy)
    assert.equal(canAccessResource({ role: 'viewer', permissions: (await permissions.get(viewerId)).permissions }, 'dashboards', dashboard.id, 'edit'), false)
    await assert.rejects(permissions.save(adminId, policy), /Administrators always have full access/)
    const eventIds = [randomUUID(), randomUUID()]
    for (const [index, ruleId] of [rule.id, otherRule.id].entries()) {
      const payload = { alertRuleId: ruleId, alertName: index ? 'Private tilt' : 'Tilt', sourceName: source.name, state: 'firing', value: 0.7, threshold: 0.5, operator: 'gt', occurredAt: new Date().toISOString() }
      await pool.query('INSERT INTO observe.alert_notifications(id,alert_rule_id,occurred_at,payload) VALUES($1,$2,now(),$3)', [eventIds[index], ruleId, JSON.stringify(payload)])
    }
    const inbox = new PostgresNotificationRepository(database)
    assert.equal((await inbox.snapshot(editorId)).unread, 1)
    assert.equal((await inbox.snapshot(adminId)).unread, 2)
    assert.equal((await inbox.after(editorId, '0', '999')).length, 1)
    await assert.rejects(inbox.markRead(editorId, { id: eventIds[1]! }), /Notification not found/)
    await inbox.markRead(editorId, { through: '999' })
    assert.equal((await inbox.snapshot(editorId)).unread, 0)
    assert.equal((await inbox.snapshot(viewerId)).unread, 1)
    await permissions.save(editorId, defaultPermissions())
    assert.equal((await inbox.snapshot(editorId)).items.length, 0)
    await records.delete('dashboards', dashboard.id)
    await records.delete('alertRules', rule.id)
    assert.equal((await permissions.get(viewerId)).permissions.dashboards.grants.length, 0)
    assert.equal((await permissions.get(viewerId)).permissions.alerts.grants.length, 0)
    // Upgrade installations that already stored per-source grants, preserving resource permissions.
    const beforeSourceCleanup = (await permissions.get(viewerId)).permissions
    await pool.query('ALTER TABLE observe.user_access ADD COLUMN query_scope text DEFAULT \'none\'')
    await pool.query('CREATE TABLE observe.user_data_source_permissions(user_id uuid REFERENCES observe.users(id), data_source_id uuid REFERENCES observe.data_sources(id), PRIMARY KEY(user_id,data_source_id))')
    await pool.query('INSERT INTO observe.user_data_source_permissions(user_id,data_source_id) VALUES($1,$2)', [viewerId, source.id])
    await pool.query('DELETE FROM observe.schema_migrations WHERE version=9')
    const sharedSources = new PostgresDatabase(connection!)
    try {
      await sharedSources.ready()
      assert.deepEqual((await new PostgresPermissionRepository(sharedSources).get(viewerId)).permissions, beforeSourceCleanup)
      assert.equal((await pool.query('SELECT to_regclass(\'observe.user_data_source_permissions\') AS table_name')).rows[0].table_name, null)
      assert.equal((await pool.query('SELECT 1 FROM information_schema.columns WHERE table_schema=\'observe\' AND table_name=\'user_access\' AND column_name=\'query_scope\'')).rowCount, 0)
    } finally { await sharedSources.close() }
    // Simulate upgrading pre-permission accounts; grants are backfilled exactly once.
    await pool.query('DELETE FROM observe.schema_migrations WHERE version=6')
    await pool.query('DELETE FROM observe.user_access')
    const upgraded = new PostgresDatabase(connection!)
    try {
      await upgraded.ready()
      assert.equal((await new PostgresPermissionRepository(upgraded).get(viewerId)).permissions.dashboards.scope, 'all')
      const newId = randomUUID()
      await pool.query('INSERT INTO observe.users(id,email,name,role) VALUES($1,$2,\'New viewer\',\'viewer\')', [newId, newId + '@example.test'])
      assert.deepEqual((await new PostgresPermissionRepository(upgraded).get(newId)).permissions, defaultPermissions())
      // Retiring the preliminary notification settings must never widen alert access.
      await pool.query('ALTER TABLE observe.user_access ADD COLUMN notification_scope text DEFAULT \'all\'')
      await pool.query('CREATE TABLE observe.user_notification_permissions(user_id uuid,alert_rule_id uuid)')
      await pool.query('INSERT INTO observe.user_access(user_id,alert_scope,notification_scope) VALUES($1,\'none\',\'all\')', [newId])
      const legacySession = randomUUID()
      await pool.query('INSERT INTO observe.auth_sessions(id,user_id,expires_at,user_agent) VALUES($1,$2,now()+interval \'1 day\',\'test\')', [legacySession, newId])
      await pool.query('DELETE FROM observe.schema_migrations WHERE version=7')
      const inherited = new PostgresDatabase(connection!)
      try {
        await inherited.ready()
        assert.deepEqual((await new PostgresPermissionRepository(inherited).get(newId)).permissions, defaultPermissions())
        assert.equal((await new PostgresNotificationRepository(inherited).snapshot(newId)).items.length, 0)
        assert.equal((await pool.query('SELECT 1 FROM information_schema.columns WHERE table_schema=\'observe\' AND table_name=\'user_access\' AND column_name=\'notification_scope\'')).rowCount, 0)
        assert.equal((await pool.query('SELECT to_regclass(\'observe.user_notification_permissions\') AS table_name')).rows[0].table_name, null)
        assert.ok((await pool.query('SELECT revoked_at FROM observe.auth_sessions WHERE id=$1', [legacySession])).rows[0].revoked_at)
      } finally { await inherited.close() }
    } finally { await upgraded.close() }
  } finally {
    await database.close()
    await pool.end()
  }
})
