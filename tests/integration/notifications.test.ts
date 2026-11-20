import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { PostgresDatabase } from '~~/server/platform/database/database'
import { PostgresWorkspaceRepository } from '~~/server/platform/database/workspace.repository'
import { PostgresNotificationRepository } from '~~/server/features/notifications/infrastructure/notification.repository'
import { NotificationService } from '~~/server/features/notifications/application/notification.service'
import { AlertService } from '~~/server/features/alerts/application/alert.service'
import type { DataSourceAccess } from '~~/server/domain/ports'

const connection = process.env.TEST_DATABASE_URL
if (!connection || !new URL(connection).pathname.endsWith('_test')) throw new Error('Use an isolated TEST_DATABASE_URL ending in _test')

test('PostgreSQL notifications persist transitions atomically with per-user read receipts and bounded replay', async () => {
  const pool = new pg.Pool({ connectionString: connection })
  const database = new PostgresDatabase(connection!)
  try {
    await pool.query('DROP SCHEMA IF EXISTS observe CASCADE')
    await database.ready()
    const users = [randomUUID(), randomUUID()]
    for (const id of users) await pool.query('INSERT INTO observe.users(id,email,name,role,enabled) VALUES($1,$2,\'Engineer\',\'viewer\',true)', [id, id + '@example.test'])
    const store = new PostgresWorkspaceRepository(database)
    const source = await store.create('dataSources', { name: 'Bridge sensors', url: 'http://influx.example.test', queryLanguage: 'flux', organization: 'sensors', database: 'bridge', username: '' })
    let value = 0.7
    const sources: DataSourceAccess = { validateSources: async () => {}, listSources: async () => [{ ...source, hasSecret: false }], query: async () => ({ columns: ['_value'], rows: [{ _value: value }], duration: 1, truncated: false }) }
    const alerts = new AlertService(store, sources, { list: async () => [], send: async () => assert.fail('Telegram is optional') }, { now: () => new Date() })
    const notifications = new NotificationService(new PostgresNotificationRepository(database))
    const rule = await alerts.saveAlert({ name: 'Pier tilt', dataSourceId: source.id, query: 'tilt', range: '1h', enabled: true, telegramDestinationIds: [], operator: 'gt', reducer: 'last', field: '_value', threshold: 0.5, interval: 60 })
    await Promise.allSettled([alerts.evaluateAlert(rule.id), alerts.evaluateAlert(rule.id)])
    await alerts.evaluateAlert(rule.id)
    const initial = await notifications.update(users[0]!)
    assert.equal(initial.items.length, 1)
    assert.equal(initial.events.length, 0, 'Historical events initialize the inbox silently')
    assert.equal(initial.unread, 1)
    assert.equal(initial.items[0]?.state, 'firing')
    await notifications.markRead(users[0]!, { id: initial.items[0]!.id })
    assert.equal((await notifications.snapshot(users[0]!)).unread, 0)
    assert.equal((await notifications.snapshot(users[1]!)).unread, 1)
    value = 0.2
    await alerts.evaluateAlert(rule.id)
    const recovery = await notifications.update(users[0]!, initial.cursor)
    assert.equal(recovery.events.length, 1)
    assert.equal(recovery.events[0]?.state, 'recovered')
    assert.equal(recovery.events[0]?.sourceName, 'Bridge sensors')
    await notifications.markRead(users[0]!, { through: initial.cursor })
    assert.equal((await notifications.snapshot(users[0]!)).unread, 1, 'Mark all must not read events arriving after the submitted cursor')
    await notifications.markRead(users[0]!, { through: recovery.cursor })
    assert.equal((await notifications.snapshot(users[0]!)).unread, 0)
    assert.equal((await notifications.snapshot(users[1]!)).unread, 2)
    const previous = await store.get('alertRules', rule.id)
    await assert.rejects(store.saveAlertEvaluation(rule.id, { evaluation: { state: 'firing', value: 999, time: new Date().toISOString() } }, { ...initial.items[0]!, occurredAt: 'invalid-date' }))
    assert.deepEqual((await store.get('alertRules', rule.id)).evaluation, previous.evaluation, 'A failed insert rolls back the evaluation too')
    await alerts.deleteAlert(rule.id)
    assert.equal((await notifications.snapshot(users[0]!)).items.length, 2, 'Historical snapshots survive rule deletion')
    await pool.query(`INSERT INTO observe.alert_notifications(id,alert_rule_id,occurred_at,payload)
      SELECT gen_random_uuid(),$1,now(),$2::jsonb FROM generate_series(1,105)`, [rule.id, JSON.stringify({ ...initial.items[0], occurredAt: new Date().toISOString() })])
    const batch = await notifications.update(users[1]!, recovery.cursor)
    assert.equal(batch.items.length, 50)
    assert.equal(batch.events.length, 100)
    const remainder = await notifications.update(users[1]!, batch.cursor)
    assert.equal(remainder.events.length, 5)
    assert.equal(new Set([...batch.events, ...remainder.events].map(item => item.sequence)).size, 105)
    await notifications.markRead(users[0]!, { through: remainder.cursor })
    const restarted = new PostgresDatabase(connection!)
    try {
      assert.equal((await new PostgresNotificationRepository(restarted).snapshot(users[0]!)).unread, 0)
    } finally { await restarted.close() }
  } finally {
    await database.close()
    await pool.end()
  }
})
