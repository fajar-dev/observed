import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { WorkspaceError } from '~~/server/core/workspace-error'
import type { Resource, StoredEntity, WorkspaceStore, DataSourceAccess, TelegramAccess } from '~~/server/core/ports'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { QueryResponse } from '#shared/domain/query'
import { CredentialVault } from '~~/server/infrastructure/security/credential-vault'
import { DataSourceService } from '~~/server/application/data-sources/data-source-service'
import { AlertService } from '~~/server/application/alerts/alert-service'

class MemoryStore implements WorkspaceStore {
  private records = new Map<string, StoredEntity<unknown>>()
  async list<T>(resource: Resource) { return [...this.records].filter(([key]) => key.startsWith(resource + ':')).map(([, record]) => record as StoredEntity<T>) }
  async find<T>(resource: Resource, id: string) { return this.records.get(resource + ':' + id) as StoredEntity<T> | undefined }
  async get<T>(resource: Resource, id: string) {
    const record = await this.find<T>(resource, id)
    if (!record) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
    return record
  }

  async create<T>(resource: Resource, value: T) {
    const record = { ...value, id: randomUUID(), updatedAt: new Date().toISOString() }
    this.records.set(resource + ':' + record.id, record)
    return record
  }

  async update<T>(resource: Resource, id: string, patch: Partial<T>, remove: string[] = []) {
    const record = { ...await this.get<T>(resource, id), ...patch }
    for (const key of remove) Reflect.deleteProperty(record, key)
    this.records.set(resource + ':' + id, record)
    return record
  }

  async delete(resource: Resource, id: string) { this.records.delete(resource + ':' + id) }
  async saveDashboard(id: string, value: DashboardDefinition) { return this.update('dashboards', id, value) }
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
  await store.create('dashboards', { panels: [{ dataSourceId: source.id }] })
  await assert.rejects(() => service.deleteSource(source.id), /Remove this data source/)
})

test('alert delivery retries individual destinations and emits recovery only after firing', async () => {
  const store = new MemoryStore(), sourceId = randomUUID(), first = randomUUID(), second = randomUUID()
  let value = 90, failOnce = true
  const deliveries: string[] = []
  const response = (): QueryResponse => ({ columns: ['_time', '_value'], rows: [{ _time: new Date().toISOString(), _value: value }], duration: 1, truncated: false })
  const sources: DataSourceAccess = { listSources: async () => [], validateSources: async () => {}, query: async () => response() }
  const telegram: TelegramAccess = { list: async () => [first, second].map(id => ({ id, name: id, chatId: id, hasToken: true })), send: async (id, text) => {
    deliveries.push(id + ':' + (text.startsWith('[FIRING]') ? 'firing' : 'recovery'))
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
