import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { Resource, ResourceValues, WorkspaceRepository } from '~~/server/domain/ports'
import { WorkspaceError } from '~~/server/domain/workspace-error'
import type { PostgresDatabase } from './database'
import { resourceMappings, decodeResource, encodeResource } from './resource-mapping'
import type { DatabaseRow } from './resource-mapping'

export class PostgresWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async list<K extends Resource>(resource: K) {
    const mapping = resourceMappings[resource]
    const { rows } = await this.database.query<DatabaseRow>(`SELECT * FROM observe.${mapping.table} ORDER BY updated_at DESC,id`)
    return rows.map(row => decodeResource<ResourceValues[K]>(mapping, row))
  }

  async find<K extends Resource>(resource: K, id: string) {
    const mapping = resourceMappings[resource]
    const { rows } = await this.database.query<DatabaseRow>(`SELECT * FROM observe.${mapping.table} WHERE id=$1`, [id])
    return rows[0] ? decodeResource<ResourceValues[K]>(mapping, rows[0]) : undefined
  }

  async get<K extends Resource>(resource: K, id: string) {
    const value = await this.find(resource, id)
    if (!value) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
    return value
  }

  private async write<K extends Resource>(client: PoolClient, resource: K, id: string, value: ResourceValues[K], create: boolean) {
    const mapping = resourceMappings[resource]
    const record = { ...value } as Record<string, unknown>
    if (typeof record.folder === 'string' && record.folder) {
      await client.query('INSERT INTO observe.dashboard_folders(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING', [randomUUID(), record.folder])
      const folder = await client.query('SELECT name FROM observe.dashboard_folders WHERE lower(name)=lower($1)', [record.folder])
      record.folder = folder.rows[0].name
    }
    const row: Record<string, unknown> = { id, ...encodeResource(mapping, record) }
    if (resource === 'alertRules') {
      const evaluation = record.evaluation as { time: string } | undefined
      row.next_evaluation_at = evaluation ? new Date(Date.parse(evaluation.time) + Number(record.interval) * 1000).toISOString() : new Date().toISOString()
    }
    const columns = Object.keys(row).filter(column => column !== 'id')
    const table = `observe.${mapping.table}`
    const sql = create
      ? `INSERT INTO ${table}(id,${columns.join(',')}) SELECT id,${columns.join(',')} FROM jsonb_populate_record(NULL::${table},$1::jsonb) RETURNING *`
      : `UPDATE ${table} SET (${columns.join(',')},updated_at)=(SELECT ${columns.join(',')},now() FROM jsonb_populate_record(NULL::${table},$1::jsonb)) WHERE id=$2 RETURNING *`
    const { rows } = await client.query<DatabaseRow>(sql, create ? [JSON.stringify(row)] : [JSON.stringify(row), id])
    if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
    await this.references(client, resource, id, record)
    return decodeResource<ResourceValues[K]>(mapping, rows[0])
  }

  private async references(client: PoolClient, resource: Resource, id: string, value: Record<string, unknown>) {
    if (resource === 'dashboards') {
      const dashboard = value as DashboardDefinition
      const ids = [...new Set([...dashboard.panels, ...(dashboard.variables ?? [])].flatMap(item => item.dataSourceId ? [item.dataSourceId] : []))]
      await client.query('DELETE FROM observe.dashboard_data_sources WHERE dashboard_id=$1', [id])
      await client.query('INSERT INTO observe.dashboard_data_sources(dashboard_id,data_source_id) SELECT $1,unnest($2::uuid[])', [id, ids])
    }
    if (resource === 'alertRules') {
      await client.query('DELETE FROM observe.alert_rule_destinations WHERE alert_rule_id=$1', [id])
      await client.query('INSERT INTO observe.alert_rule_destinations(alert_rule_id,telegram_destination_id) SELECT $1,unnest($2::uuid[])', [id, value.telegramDestinationIds])
    }
  }

  create<K extends Resource>(resource: K, value: ResourceValues[K]) {
    return this.database.transaction(client => this.write(client, resource, randomUUID(), value, true))
  }

  update<K extends Resource>(resource: K, id: string, patch: Partial<ResourceValues[K]>, remove: string[] = []) {
    return this.database.transaction(async (client) => {
      const mapping = resourceMappings[resource]
      const { rows } = await client.query<DatabaseRow>(`SELECT * FROM observe.${mapping.table} WHERE id=$1 FOR UPDATE`, [id])
      if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
      const value = { ...decodeResource<ResourceValues[K]>(mapping, rows[0]), ...patch }
      for (const field of remove) Reflect.deleteProperty(value, field)
      return this.write(client, resource, id, value, false)
    })
  }

  async delete(resource: Resource, id: string) {
    const result = await this.database.query(`DELETE FROM observe.${resourceMappings[resource].table} WHERE id=$1`, [id])
    if (!result.rowCount) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  saveDashboard(id: string, value: DashboardDefinition) {
    return this.database.transaction(async (client) => {
      const { rows } = await client.query<DatabaseRow>('SELECT * FROM observe.dashboards WHERE id=$1 FOR UPDATE', [id])
      if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Dashboard not found' })
      const previous = decodeResource<DashboardDefinition>(resourceMappings.dashboards, rows[0])
      if (!value.revision || value.revision !== previous.revision) throw new WorkspaceError({ statusCode: 409, statusMessage: 'The dashboard changed. Reload before saving.' })
      await this.write(client, 'dashboardVersions', randomUUID(), { dashboardId: id, snapshot: previous }, true)
      const saved = await this.write(client, 'dashboards', id, { ...value, revision: value.revision + 1 }, false)
      await client.query('DELETE FROM observe.dashboard_versions WHERE dashboard_id=$1 AND id NOT IN (SELECT id FROM observe.dashboard_versions WHERE dashboard_id=$1 ORDER BY updated_at DESC,id DESC LIMIT 100)', [id])
      return saved
    })
  }

  async isReferenced(resource: 'dataSources' | 'telegramDestinations' | 'dashboardFolders', id: string) {
    const queries = {
      dataSources: 'SELECT EXISTS(SELECT 1 FROM observe.dashboard_data_sources WHERE data_source_id=$1) OR EXISTS(SELECT 1 FROM observe.alert_rules WHERE data_source_id=$1) AS found',
      telegramDestinations: 'SELECT EXISTS(SELECT 1 FROM observe.alert_rule_destinations WHERE telegram_destination_id=$1) AS found',
      dashboardFolders: 'SELECT EXISTS(SELECT 1 FROM observe.dashboards WHERE folder_name=(SELECT name FROM observe.dashboard_folders WHERE id=$1)) OR EXISTS(SELECT 1 FROM observe.alert_rules WHERE folder_name=(SELECT name FROM observe.dashboard_folders WHERE id=$1)) AS found'
    }
    const { rows } = await this.database.query(queries[resource], [id])
    return rows[0]?.found === true
  }

  async dueAlerts(now: Date) {
    const { rows } = await this.database.query<DatabaseRow>('SELECT * FROM observe.alert_rules WHERE enabled AND next_evaluation_at<=$1 ORDER BY next_evaluation_at,id', [now])
    return rows.map(row => decodeResource<ResourceValues['alertRules']>(resourceMappings.alertRules, row))
  }

  async versions(dashboardId: string) {
    const { rows } = await this.database.query<DatabaseRow>('SELECT * FROM observe.dashboard_versions WHERE dashboard_id=$1 ORDER BY updated_at DESC,id DESC LIMIT 100', [dashboardId])
    return rows.map(row => decodeResource<{ dashboardId: string, snapshot: DashboardDefinition }>(resourceMappings.dashboardVersions, row))
  }

  withLock<T>(key: string, action: () => Promise<T>) { return this.database.withLock(key, action) }
}
