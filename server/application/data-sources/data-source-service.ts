import { WorkspaceError } from '../../core/workspace-error'
import type { AlertRule } from '#shared/domain/alert-rule'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { DataSource, DataSourceInput } from '#shared/domain/data-source'
import type { QueryRequest } from '#shared/domain/query'

import type { WorkspaceStore, SecretVault, QueryGateway } from '../../core/ports'

type StoredSource = Omit<DataSourceInput, 'secret'> & { ciphertext?: string }

function publicSource({ ciphertext, ...source }: StoredSource & { id: string }): DataSource {
  return { ...source, hasSecret: Boolean(ciphertext) }
}

export class DataSourceService {
  constructor(private readonly store: WorkspaceStore, private readonly vault: SecretVault, private readonly queries: QueryGateway) {}

  async listSources() {
    return (await this.store.list<StoredSource>('dataSources')).map(publicSource)
  }

  async saveSource(input: DataSourceInput, id?: string) {
    const { secret, ...data } = input
    const value: StoredSource = { ...data, username: data.username ?? '' }
    if (secret) value.ciphertext = this.vault.encrypt(secret)
    const record = id
      ? await this.store.update<StoredSource>('dataSources', id, value, secret === '' ? ['ciphertext'] : [])
      : await this.store.create('dataSources', value)
    return publicSource(record)
  }

  private async sourceCredentials(id: string): Promise<DataSourceInput> {
    const { ciphertext, ...source } = await this.store.get<StoredSource>('dataSources', id)
    return { ...source, secret: ciphertext ? this.vault.decrypt(ciphertext) : undefined }
  }

  query(input: QueryRequest) {
    return this.sourceCredentials(input.dataSourceId).then(source => this.queries.query(source, input))
  }

  async testSource(id: string) {
    const source = await this.sourceCredentials(id)
    const query = source.queryLanguage === 'flux'
      ? 'from(bucket: v.defaultBucket) |> range(start: v.timeRangeStart, stop: v.timeRangeStop) |> limit(n: 1)'
      : 'SHOW MEASUREMENTS LIMIT 1'
    const result = await this.queries.query(source, { query, range: '15m' })
    return { duration: result.duration }
  }

  async validateSources(ids: string[]) {
    const available = new Set((await this.listSources()).map(source => source.id))
    if (ids.some(id => !available.has(id))) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Select an existing data source' })
  }

  async deleteSource(id: string) {
    const [alerts, dashboards] = await Promise.all([
      this.store.list<AlertRule>('alertRules'), this.store.list<DashboardDefinition>('dashboards')
    ])
    if (alerts.some(alert => alert.dataSourceId === id) || dashboards.some(dashboard => dashboard.panels.some(panel => panel.dataSourceId === id) || dashboard.variables?.some(variable => variable.dataSourceId === id))) {
      throw new WorkspaceError({ statusCode: 409, statusMessage: 'Remove this data source from its dashboards and alerts before deleting it' })
    }
    await this.store.delete('dataSources', id)
  }
}
