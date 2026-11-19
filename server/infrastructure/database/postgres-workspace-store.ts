import { WorkspaceError } from '../../core/workspace-error'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { Resource, StoredEntity, WorkspaceStore } from '../../core/ports'
import { initialWorkspaceMigration } from './migrations/initial-workspace'

const tables: Record<Resource, string> = {
  dataSources: 'observe.data_sources', dashboards: 'observe.dashboards', alertRules: 'observe.alert_rules',
  telegramDestinations: 'observe.telegram_destinations', dashboardFolders: 'observe.dashboard_folders', dashboardVersions: 'observe.dashboard_versions'
}
type DatabaseRow<T> = { id: string, document: T, updated_at: Date }

export class PostgresWorkspaceStore implements WorkspaceStore {
  private readonly pool: pg.Pool
  private readonly locks: pg.Pool
  private initialization?: Promise<void>

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000, max: 12 })
    this.locks = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000, max: 4 })
    for (const pool of [this.pool, this.locks]) pool.on('error', error => console.error('PostgreSQL connection error', error.message))
  }

  private ready() {
    this.initialization ??= this.migrate().catch((error) => {
      this.initialization = undefined
      throw error
    })
    return this.initialization
  }

  private async migrate() {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended(\'observe:schema\', 0))')
      await client.query(initialWorkspaceMigration)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  }

  private map<T>(row: DatabaseRow<T>): StoredEntity<T> {
    return { ...row.document, id: row.id, updatedAt: row.updated_at.toISOString() }
  }

  async list<T>(resource: Resource) {
    await this.ready()
    const result = await this.pool.query(`SELECT id, document, updated_at FROM ${tables[resource]} ORDER BY updated_at DESC, id`)
    return result.rows.map(row => this.map<T>(row))
  }

  async find<T>(resource: Resource, id: string) {
    await this.ready()
    const { rows } = await this.pool.query(`SELECT id, document, updated_at FROM ${tables[resource]} WHERE id = $1`, [id])
    return rows[0] ? this.map<T>(rows[0]) : undefined
  }

  async get<T>(resource: Resource, id: string) {
    const entity = await this.find<T>(resource, id)
    if (!entity) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
    return entity
  }

  async create<T>(resource: Resource, value: T) {
    await this.ready()
    const { rows } = await this.pool.query(`INSERT INTO ${tables[resource]} (id, document) VALUES ($1, $2) RETURNING id, document, updated_at`, [randomUUID(), JSON.stringify(value)])
    return this.map<T>(rows[0])
  }

  async update<T>(resource: Resource, id: string, patch: Partial<T>, remove: string[] = []) {
    await this.ready()
    const { rows } = await this.pool.query(`UPDATE ${tables[resource]} SET document = (document - $3::text[]) || $2::jsonb, updated_at = now() WHERE id = $1 RETURNING id, document, updated_at`, [id, JSON.stringify(patch), remove])
    if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
    return this.map<T>(rows[0])
  }

  async delete(resource: Resource, id: string) {
    await this.ready()
    const result = await this.pool.query(`DELETE FROM ${tables[resource]} WHERE id = $1`, [id])
    if (!result.rowCount) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  async saveDashboard(id: string, value: DashboardDefinition) {
    await this.ready()
    if (!value.revision) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Dashboard revision is required' })
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query('SELECT id, document, updated_at FROM observe.dashboards WHERE id = $1 FOR UPDATE', [id])
      const previous = rows[0]
      if (!previous) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Dashboard not found' })
      if (value.revision !== previous.document.revision) throw new WorkspaceError({ statusCode: 409, statusMessage: 'The dashboard changed. Reload before saving.' })
      await client.query('INSERT INTO observe.dashboard_versions (id, document) VALUES ($1, $2)', [randomUUID(), JSON.stringify({ dashboardId: id, snapshot: previous.document })])
      const updated = await client.query('UPDATE observe.dashboards SET document = $2, updated_at = now() WHERE id = $1 RETURNING id, document, updated_at', [id, JSON.stringify({ ...value, revision: value.revision + 1 })])
      await client.query('COMMIT')
      return this.map<DashboardDefinition>(updated.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  }

  async withLock<T>(id: string, action: () => Promise<T>) {
    await this.ready()
    const client = await this.locks.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked', [id])
      if (rows[0].locked) return await action()
    } finally {
      try {
        await client.query('ROLLBACK')
      } finally {
        client.release()
      }
    }
  }

  async close() { await Promise.all([this.pool.end(), this.locks.end()]) }
}
