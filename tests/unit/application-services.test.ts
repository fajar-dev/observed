import type { AlertNotificationInput } from '#shared/domain/notification'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { WorkspaceError } from '~~/server/domain/workspace-error'
import type { Resource, ResourceValues, StoredEntity, WorkspaceRepository, DataSourceAccess, TelegramAccess } from '~~/server/domain/ports'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { QueryResponse } from '#shared/domain/query'
import { CredentialVault } from '~~/server/platform/security/credential-vault'
import { DataSourceService } from '~~/server/features/data-sources/application/data-source.service'
import { AlertService } from '~~/server/features/alerts/application/alert.service'

class MemoryStore implements WorkspaceRepository {
  notifications: AlertNotificationInput[] = []
  private records = new Map<string, StoredEntity<unknown>>()
  async list<K extends Resource>(resource: K) { return [...this.records].filter(([key]) => key.startsWith(resource + ':')).map(([, record]) => record as StoredEntity<ResourceValues[K]>) }
  async find<K extends Resource>(resource: K, id: string) { return this.records.get(resource + ':' + id) as StoredEntity<ResourceValues[K]> | undefined }
  async get<K extends Resource>(resource: K, id: string) {
    const record = await this.find(resource, id)
    if (!record) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
    return record
  }

  async create<K extends Resource>(resource: K, value: ResourceValues[K]) {
    const record = { ...value, id: randomUUID(), updatedAt: new Date().toISOString() }
    this.records.set(resource + ':' + record.id, record)
    return record
  }

  async update<K extends Resource>(resource: K, id: string, patch: Partial<ResourceValues[K]>, remove: string[] = []) {
    const record = { ...await this.get(resource, id), ...patch }
    for (const key of remove) Reflect.deleteProperty(record, key)
    this.records.set(resource + ':' + id, record)
    return record
  }

  async saveAlertEvaluation(id: string, patch: Partial<ResourceValues['alertRules']>, notification?: AlertNotificationInput) {
    await this.update('alertRules', id, patch)
    if (notification) this.notifications.push(notification)
  }

  async delete(resource: Resource, id: string) { this.records.delete(resource + ':' + id) }
  async saveDashboard(id: string, value: DashboardDefinition) { return this.update('dashboards', id, value) }
  async isReferenced(resource: 'dataSources' | 'telegramDestinations' | 'dashboardFolders', id: string) {
    const dashboards = await this.list('dashboards'), alerts = await this.list('alertRules')
    if (resource === 'dataSources') return dashboards.some(item => item.panels.some(panel => panel.dataSourceId === id) || item.variables?.some(variable => variable.dataSourceId === id)) || alerts.some(rule => rule.dataSourceId === id)
    if (resource === 'telegramDestinations') return alerts.some(rule => rule.telegramDestinationIds.includes(id))
    const folder = await this.get('dashboardFolders', id)
    return dashboards.some(item => item.folder === folder.name) || alerts.some(item => item.folder === folder.name)
  }

  async dueAlerts() { return (await this.list('alertRules')).filter(rule => rule.enabled) }
  async versions(id: string) { return (await this.list('dashboardVersions')).filter(version => version.dashboardId === id) }
  async withLock<T>(_id: string, action: () => Promise<T>) { return action() }
}

test('credential encryption authenticates ciphertext and uses a unique IV', () => {
  const vault = new CredentialVault(randomBytes(32).toString('base64'))
  const first = vault.encrypt('test-credential')
  assert.equal(vault.decrypt(first), 'test-credential')
  assert.notEqual(first, vault.encrypt('test-credential'))
  const tampered = Buffer.from(first, 'base64')
  tampered[tampered.length - 1]! ^= 1
  assert.throws(() => vault.decrypt(tampered.toString('base64')))
  assert.throws(() => new CredentialVault('invalid-key'))
})

test('data source service conceals credentials and preserves them during editing', async () => {
  const store = new MemoryStore()
  let credential: string | undefined
  const service = new DataSourceService(store, new CredentialVault(randomBytes(32).toString('base64')), { query: async (source) => {
    credential = source.secret
    return { columns: ['value'], rows: [{ value: 42 }], duration: 1, truncated: false }
  } })
  const input = { name: 'Local', url: 'http://localhost:8086', queryLanguage: 'flux' as const, organization: 'test', database: 'metrics', secret: 'credential' }
  const source = await service.saveSource(input)
  assert.equal(source.hasSecret, true)
  assert.equal('ciphertext' in source, false)
  assert.equal('secret' in source, false)
  const updated = await service.saveSource({ ...input, name: 'Edited', secret: undefined }, source.id)
  assert.equal(updated.hasSecret, true)
  await service.query({ dataSourceId: source.id, query: 'query', range: '1h' })
  assert.equal(credential, 'credential')
  await store.create('dashboards', { name: 'Usage', description: '', range: '1h', refresh: 0, panels: [{ id: randomUUID(), title: 'Usage', type: 'line', span: 6, dataSourceId: source.id, query: 'cpu', additionalQueries: [] }] })
  await assert.rejects(() => service.deleteSource(source.id), /Remove this data source/)
})

test('alert delivery retries individual destinations and emits recovery only after firing', async () => {
  const store = new MemoryStore(), sourceId = randomUUID(), first = randomUUID(), second = randomUUID()
  let value = 90, failOnce = true
  const deliveries: string[] = []
  const response = (): QueryResponse => ({ columns: ['_time', '_value'], rows: [{ _time: new Date().toISOString(), _value: value }], duration: 1, truncated: false })
  const sources: DataSourceAccess = { listSources: async () => [{ id: sourceId, name: 'Production InfluxDB', url: 'http://influx.example.test', queryLanguage: 'flux', organization: 'test', database: 'metrics', hasSecret: true }], validateSources: async () => {}, query: async () => response() }
  const telegram: TelegramAccess = { list: async () => [first, second].map(id => ({ id, name: id, chatId: id, hasToken: true })), send: async (id, text, options) => {
    assert.equal(options?.parseMode, 'HTML')
    assert.ok(text.includes('<b>Source:</b> Production InfluxDB'))
    assert.ok(text.includes('<b>Threshold alert:</b> <code>&gt; 80</code>'))
    deliveries.push(id + ':' + (text.includes('<b>FIRING</b>') ? 'firing' : 'recovery'))
    if (id === second && failOnce) {
      failOnce = false
      throw new Error('temporary failure')
    }
  } }
  const alerts = new AlertService(store, sources, telegram, { now: () => new Date() })
  const rule = await alerts.saveAlert({ name: 'CPU', dataSourceId: sourceId, query: 'cpu', range: '1h', telegramDestinationIds: [first, second], enabled: true, operator: 'gt', reducer: 'last', field: '_value', threshold: 80, interval: 60, pendingFor: 0 })
  const initial = await alerts.evaluateAlert(rule.id)
  assert.equal(initial?.state, 'firing')
  assert.match(initial?.deliveryError ?? '', /1 destination/)
  await alerts.evaluateAlert(rule.id)
  assert.equal(deliveries.filter(message => message === first + ':firing').length, 1)
  assert.equal(deliveries.filter(message => message === second + ':firing').length, 2)
  value = 10
  assert.equal((await alerts.evaluateAlert(rule.id))?.state, 'normal')
  assert.equal(deliveries.filter(message => message.endsWith(':recovery')).length, 2)
  await alerts.evaluateAlert(rule.id)
  assert.equal(deliveries.filter(message => message.endsWith(':recovery')).length, 2)
})

test('alert preview returns its query data from one execution without sending notifications', async () => {
  const store = new MemoryStore()
  let executions = 0
  const queryResult: QueryResponse = { columns: ['_time', '_value'], rows: [{ _time: '2026-11-19T00:00:00Z', _value: 90 }], duration: 12, truncated: false }
  const sources: DataSourceAccess = { listSources: async () => [], validateSources: async () => {}, query: async () => {
    executions++
    return queryResult
  } }
  const telegram: TelegramAccess = { list: async () => [], send: async () => assert.fail('A preview must never send Telegram notifications') }
  const service = new AlertService(store, sources, telegram, { now: () => new Date('2026-11-19T00:00:00Z') })
  const preview = await service.previewAlert({ dataSourceId: randomUUID(), query: 'cpu', range: '1h', field: '_value', operator: 'gt', reducer: 'last', threshold: 80, interval: 60, pendingFor: 0 })
  assert.equal(executions, 1)
  assert.equal(preview.state, 'firing')
  assert.equal(preview.value, 90)
  assert.deepEqual(preview.queryResult, queryResult)
})

test('in-app alerts work without Telegram, deduplicate episodes and honor pending, mute and pause', async () => {
  const store = new MemoryStore(), sourceId = randomUUID()
  let value = 0.7, now = new Date('2026-11-20T00:00:00Z'), queryFails = false
  const sources: DataSourceAccess = { listSources: async () => [{ id: sourceId, name: 'Bridge sensors', url: 'http://influx.test', queryLanguage: 'flux', organization: 'test', database: 'sensors', hasSecret: true }], validateSources: async () => {}, query: async () => {
    if (queryFails) throw new Error('offline')
    return { columns: ['_value'], rows: [{ _value: value }], duration: 1, truncated: false }
  } }
  const service = new AlertService(store, sources, { list: async () => [], send: async () => assert.fail('No Telegram destinations') }, { now: () => now })
  const input = { name: 'Pier tilt', dataSourceId: sourceId, query: 'tilt', range: '1h' as const, telegramDestinationIds: [], enabled: true, operator: 'gt' as const, reducer: 'last' as const, field: '_value', threshold: 0.5, interval: 60, pendingFor: 60 }
  const rule = await service.saveAlert(input)
  assert.equal((await service.evaluateAlert(rule.id))?.state, 'pending')
  assert.equal(store.notifications.length, 0)
  now = new Date(now.getTime() + 60000)
  await service.evaluateAlert(rule.id)
  await service.evaluateAlert(rule.id)
  assert.deepEqual(store.notifications.map(item => item.state), ['firing'])
  assert.equal(store.notifications[0]?.sourceName, 'Bridge sensors')
  queryFails = true
  await service.evaluateAlert(rule.id)
  assert.equal(store.notifications.length, 1)
  queryFails = false
  await service.evaluateAlert(rule.id)
  now = new Date(now.getTime() + 60000)
  await service.evaluateAlert(rule.id)
  assert.equal(store.notifications.length, 1, 'Query errors must not create a second firing episode')
  value = 0.2
  await service.evaluateAlert(rule.id)
  await service.evaluateAlert(rule.id)
  assert.deepEqual(store.notifications.map(item => item.state), ['firing', 'recovered'])
  await service.saveAlert({ ...input, pendingFor: 0, muteUntil: '2026-11-21T00:00:00Z' }, rule.id)
  value = 0.8
  await service.evaluateAlert(rule.id)
  assert.equal(store.notifications.length, 2)
  await service.saveAlert({ ...input, pendingFor: 0, enabled: false }, rule.id)
  await service.evaluateAlert(rule.id)
  assert.equal(store.notifications.length, 2)
  await service.saveAlert({ ...input, pendingFor: 0, muteUntil: null }, rule.id)
  await service.evaluateAlert(rule.id)
  assert.deepEqual(store.notifications.map(item => item.state), ['firing', 'recovered', 'firing'])
})
