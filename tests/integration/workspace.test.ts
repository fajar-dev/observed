import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import pg from 'pg'
import { PostgresDatabase } from '~~/server/platform/database/database'
import { PostgresWorkspaceRepository } from '~~/server/platform/database/workspace.repository'
import { DataSourceService } from '~~/server/features/data-sources/application/data-source.service'
import { TelegramService } from '~~/server/features/telegram/application/telegram.service'
import { CredentialVault } from '~~/server/platform/security/credential-vault'
import { authenticationMigration } from '~~/server/platform/database/migrations/authentication'

const connection = process.env.TEST_DATABASE_URL
if (!connection || !new URL(connection).pathname.endsWith('_test')) throw new Error('Set TEST_DATABASE_URL to an isolated database ending in _test')
const conflict = (error: unknown) => (error as { statusCode: number }).statusCode === 409

test('relational workspace CRUD, foreign keys, snapshots and concurrent revision protection', async () => {
  const pool = new pg.Pool({ connectionString: connection })
  const database = new PostgresDatabase(connection!)
  const repository = new PostgresWorkspaceRepository(database)
  try {
    await pool.query('DROP SCHEMA IF EXISTS observe CASCADE')
    const vault = new CredentialVault(randomBytes(32).toString('base64'))
    const sources = new DataSourceService(repository, vault, { query: async () => ({ rows: [{ value: 42 }], columns: ['value'], duration: 1, truncated: false }) })
    const telegram = new TelegramService(repository, vault, { send: async () => {} })
    const source = await sources.saveSource({ name: 'Metrics', url: 'http://influx.example.test:8086', queryLanguage: 'flux', organization: 'test', database: 'metrics', secret: 'private-source-token' })
    const destination = await telegram.save({ name: 'Operations', chatId: '-100123', token: 'private-telegram-token' })
    assert.equal(source.hasSecret, true)
    assert.equal(destination.hasToken, true)
    assert.equal('ciphertext' in source, false)
    const stored = await pool.query('SELECT credential_ciphertext FROM observe.data_sources')
    assert.notEqual(stored.rows[0].credential_ciphertext, 'private-source-token')
    const dashboard = await repository.create('dashboards', { name: 'Overview', description: '', folder: 'Infrastructure', tags: ['host'], range: '1h', refresh: 15, revision: 1, panels: [{ id: randomUUID(), title: 'CPU', type: 'line', span: 6, dataSourceId: source.id, query: 'cpu', additionalQueries: [] }] })
    assert.equal((await repository.list('dashboardFolders'))[0]?.name, 'Infrastructure')
    assert.equal(await repository.isReferenced('dataSources', source.id), true)
    await assert.rejects(repository.delete('dataSources', source.id), conflict)
    const revised = await repository.saveDashboard(dashboard.id, { ...dashboard, name: 'Updated' })
    assert.equal(revised.revision, 2)
    assert.equal((await repository.versions(dashboard.id))[0]?.snapshot.name, 'Overview')
    await assert.rejects(repository.saveDashboard(dashboard.id, { ...dashboard, name: 'Stale' }), conflict)
    const writes = await Promise.allSettled([
      repository.saveDashboard(dashboard.id, { ...revised, name: 'First write' }),
      repository.saveDashboard(dashboard.id, { ...revised, name: 'Second write' })
    ])
    assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(writes.filter(result => result.status === 'rejected' && conflict(result.reason)).length, 1)
    const rule = await repository.create('alertRules', { name: 'CPU above 80', dataSourceId: source.id, query: 'cpu', range: '5m', enabled: true, interval: 60, threshold: 80, operator: 'gt', reducer: 'last', field: 'value', telegramDestinationIds: [destination.id] })
    assert.equal((await repository.dueAlerts(new Date(Date.now() + 1000))).length, 1)
    await assert.rejects(repository.delete('telegramDestinations', destination.id), conflict)
    await repository.update('alertRules', rule.id, { evaluation: { state: 'normal', value: 10, time: new Date().toISOString() } })
    assert.equal((await repository.dueAlerts(new Date())).length, 0)
    const folders = await repository.list('dashboardFolders')
    await assert.rejects(repository.delete('dashboardFolders', folders[0]!.id), conflict)
    await repository.delete('alertRules', rule.id)
    await repository.delete('dashboards', dashboard.id)
    assert.equal((await repository.versions(dashboard.id)).length, 0)
    await repository.delete('dataSources', source.id)
    await repository.delete('telegramDestinations', destination.id)
    await repository.delete('dashboardFolders', folders[0]!.id)
    assert.deepEqual(await repository.list('dataSources'), [])
  } finally {
    await database.close()
    await pool.end()
  }
})

test('document-schema upgrade preserves credentials, dashboards, alerts and authentication', async () => {
  const pool = new pg.Pool({ connectionString: connection })
  const database = new PostgresDatabase(connection!)
  try {
    await pool.query('DROP SCHEMA IF EXISTS observe CASCADE; CREATE SCHEMA observe')
    for (const table of ['data_sources', 'telegram_destinations', 'dashboard_folders', 'dashboards', 'dashboard_versions', 'alert_rules']) {
      await pool.query(`CREATE TABLE observe.${table}(id uuid PRIMARY KEY,document jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())`)
    }
    await pool.query(authenticationMigration)
    const userId = randomUUID(), sourceId = randomUUID(), destinationId = randomUUID(), dashboardId = randomUUID()
    await pool.query('INSERT INTO observe.users(id,email,name,role) VALUES($1,\'existing@example.test\',\'Existing\',\'admin\')', [userId])
    const source = { name: 'Metrics', url: 'http://influx.example.test:8086', queryLanguage: 'flux', database: 'metrics', organization: 'test', ciphertext: 'encrypted-existing-credential' }
    const dashboard = { name: 'Existing dashboard', description: '', range: '1h', refresh: 0, folder: 'Infrastructure', panels: [{ id: randomUUID(), title: 'CPU', type: 'line', dataSourceId: sourceId, query: 'cpu', span: 6, additionalQueries: [] }], tags: [], revision: 3 }
    const records = [
      ['data_sources', sourceId, source],
      ['telegram_destinations', destinationId, { name: 'Operations', chatId: '-100123', ciphertext: 'encrypted-existing-bot' }],
      ['dashboards', dashboardId, dashboard],
      ['dashboard_versions', randomUUID(), { dashboardId, snapshot: { ...dashboard, revision: 2 } }],
      ['alert_rules', randomUUID(), { name: 'CPU', dataSourceId: sourceId, query: 'cpu', range: '1h', enabled: false, interval: 60, telegramDestinationIds: [destinationId], operator: 'gt', reducer: 'last', field: 'value', threshold: 80 }]
    ] as const
    for (const [table, id, document] of records) await pool.query(`INSERT INTO observe.${table}(id,document) VALUES($1,$2)`, [id, JSON.stringify(document)])
    await database.ready()
    const repository = new PostgresWorkspaceRepository(database)
    assert.equal((await repository.get('dataSources', sourceId)).ciphertext, source.ciphertext)
    assert.equal((await repository.get('dashboards', dashboardId)).revision, 3)
    assert.equal((await repository.versions(dashboardId))[0]?.snapshot.revision, 2)
    assert.equal(await repository.isReferenced('telegramDestinations', destinationId), true)
    assert.equal((await pool.query('SELECT id FROM observe.users')).rows[0].id, userId)
    assert.equal((await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'observe\' AND table_name LIKE \'%_documents\'')).rowCount, 0)
    assert.equal((await pool.query('SELECT singleton FROM observe.auth_setup')).rows[0].singleton, true)
  } finally {
    await database.close()
    await pool.end()
  }
})
