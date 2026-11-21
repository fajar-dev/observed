import { notificationPreferencesMigration } from './migrations/notification-preferences'
import { permissionsMigration } from './migrations/permissions'
import pg from 'pg'
import { notificationsMigration } from './migrations/notifications'
import type { QueryResultRow } from 'pg'
import { WorkspaceError } from '~~/server/domain/workspace-error'
import { authenticationMigration } from './migrations/authentication'
import { normalizeWorkspace } from './migrations/normalize-workspace'

export class PostgresDatabase {
  private readonly pool: pg.Pool
  private readonly lockPool: pg.Pool
  private initialization?: Promise<void>

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000, max: 12 })
    this.lockPool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000, max: 4 })
    for (const pool of [this.pool, this.lockPool]) pool.on('error', () => console.error('PostgreSQL connection failed'))
  }

  private async migrate() {
    await this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended(\'observe:schema\',0))')
      await client.query('CREATE SCHEMA IF NOT EXISTS observe; CREATE TABLE IF NOT EXISTS observe.schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
      await normalizeWorkspace(client)
      await client.query(authenticationMigration)
      await client.query(notificationsMigration)
      await client.query(permissionsMigration)
      await client.query(notificationPreferencesMigration)
      await client.query('INSERT INTO observe.schema_migrations(version) VALUES(4) ON CONFLICT DO NOTHING')
    }, false)
  }

  ready() {
    this.initialization ??= this.migrate().catch((error) => {
      this.initialization = undefined
      throw error
    })
    return this.initialization
  }

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, parameters: unknown[] = []) {
    await this.ready()
    try {
      return await this.pool.query<T>(sql, parameters)
    } catch (error) {
      throw this.failure(error)
    }
  }

  async transaction<T>(action: (client: pg.PoolClient) => Promise<T>, initialize = true): Promise<T> {
    if (initialize) await this.ready()
    const client = await this.pool.connect().catch((error) => {
      throw this.failure(error)
    })
    try {
      await client.query('BEGIN')
      const value = await action(client)
      await client.query('COMMIT')
      return value
    } catch (error) {
      await client.query('ROLLBACK')
      throw this.failure(error)
    } finally { client.release() }
  }

  async withLock<T>(key: string, action: () => Promise<T>) {
    await this.ready()
    const client = await this.lockPool.connect().catch((error) => {
      throw this.failure(error)
    })
    try {
      const { rows } = await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked', [key])
      if (!rows[0].locked) return undefined
      try {
        return await action()
      } finally {
        await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [key])
      }
    } finally { client.release() }
  }

  private failure(error: unknown): Error {
    const code = (error as { code?: string }).code
    if (code === '23505') return new WorkspaceError({ statusCode: 409, statusMessage: 'A record with this name or identity already exists' })
    if (code === '23503' || code === '23001') return new WorkspaceError({ statusCode: 409, statusMessage: 'A referenced resource is missing or still in use. Reload and try again.' })
    if (code === '23514' || code === '23502' || code === '22P02') return new WorkspaceError({ statusCode: 422, statusMessage: 'The record contains invalid values' })
    if (error instanceof WorkspaceError) return error
    return new WorkspaceError({ statusCode: 503, statusMessage: 'Database operation failed. Try again shortly.', cause: error })
  }

  async close() { await Promise.all([this.pool.end(), this.lockPool.end()]) }
}
