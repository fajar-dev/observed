import type pg from 'pg'
import type { PostgresDatabase } from '~~/server/platform/database/database'
import { randomUUID } from 'node:crypto'
import type { AuthProvider, AuthUser, UserInput } from '#shared/domain/auth'
import type { AuthenticationRepository, UserRecord } from '~~/server/features/auth/domain/authentication.ports'
import { WorkspaceError } from '~~/server/domain/workspace-error'

type UserRow = { id: string, email: string, name: string, role: AuthUser['role'], enabled: boolean, password_hash: string | null, created_at: Date, last_sign_in_at: Date | null }
const mapUser = (row: UserRow): AuthUser => ({ id: row.id, email: row.email, name: row.name, role: row.role, enabled: row.enabled, hasPassword: !!row.password_hash, createdAt: row.created_at.toISOString(), lastSignInAt: row.last_sign_in_at?.toISOString() ?? null })
const conflict = (message: string) => new WorkspaceError({ statusCode: 409, statusMessage: message })

export class PostgresAuthenticationRepository implements AuthenticationRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async isSetupComplete() {
    const { rows } = await this.database.query('SELECT EXISTS(SELECT 1 FROM observe.auth_setup) OR EXISTS(SELECT 1 FROM observe.users) AS found')
    return rows[0]?.found === true
  }

  async findUser(email: string): Promise<UserRecord | undefined> {
    const { rows } = await this.database.query<UserRow>('SELECT * FROM observe.users WHERE email = $1', [email])
    return rows[0] ? { ...mapUser(rows[0]), passwordHash: rows[0].password_hash } : undefined
  }

  async getUser(id: string): Promise<UserRecord | undefined> {
    const { rows } = await this.database.query<UserRow>('SELECT * FROM observe.users WHERE id = $1', [id])
    return rows[0] ? { ...mapUser(rows[0]), passwordHash: rows[0].password_hash } : undefined
  }

  async listUsers() {
    const { rows } = await this.database.query<UserRow>('SELECT * FROM observe.users ORDER BY name, id')
    return rows.map(mapUser)
  }

  async saveUser(input: UserInput, passwordHash: string | null, id?: string, actorId?: string, first = false) {
    return this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended(\'observe:users\', 0))')
      if (first) {
        const { rows } = await client.query('SELECT EXISTS(SELECT 1 FROM observe.auth_setup) OR EXISTS(SELECT 1 FROM observe.users) AS complete')
        if (rows[0].complete) throw conflict('Initial setup is already complete. Sign in with your account.')
      }
      if (id) {
        const { rows } = await client.query<UserRow>('SELECT * FROM observe.users WHERE id = $1 FOR UPDATE', [id])
        const previous = rows[0]
        if (!previous) throw new WorkspaceError({ statusCode: 404, statusMessage: 'User not found' })
        if (id === actorId && (!input.enabled || input.role !== previous.role)) throw conflict('You cannot disable your own account or change your own role')
        await this.protectAdmin(client, previous, input.role === 'admin' && input.enabled)
        const result = await client.query<UserRow>('UPDATE observe.users SET email=$2, name=$3, role=$4, enabled=$5, password_hash=COALESCE($6,password_hash) WHERE id=$1 RETURNING *', [id, input.email, input.name, input.role, input.enabled, passwordHash])
        if (passwordHash || !input.enabled || previous.role !== input.role || previous.email !== input.email) {
          await client.query('UPDATE observe.auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [id])
        }
        return mapUser(result.rows[0]!)
      }
      const { rows } = await client.query<UserRow>('INSERT INTO observe.users(id,email,name,role,enabled,password_hash) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [randomUUID(), input.email, input.name, input.role, input.enabled, passwordHash])
      if (first) await client.query('INSERT INTO observe.auth_setup(singleton) VALUES(true)')
      return mapUser(rows[0]!)
    })
  }

  private async protectAdmin(client: pg.PoolClient, user: UserRow, staysAdmin: boolean) {
    if (user.role !== 'admin' || !user.enabled || staysAdmin) return
    const { rows } = await client.query('SELECT count(*)::integer AS count FROM observe.users WHERE role=\'admin\' AND enabled')
    if (rows[0].count <= 1) throw conflict('Keep at least one active administrator')
  }

  async deleteUser(id: string, actorId: string) {
    await this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended(\'observe:users\', 0))')
      if (id === actorId) throw conflict('You cannot delete your own account')
      const { rows } = await client.query<UserRow>('SELECT * FROM observe.users WHERE id=$1 FOR UPDATE', [id])
      if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'User not found' })
      await this.protectAdmin(client, rows[0], false)
      await client.query('DELETE FROM observe.users WHERE id=$1', [id])
    })
  }

  async updateProfile(id: string, name: string, passwordHash?: string, expectedHash?: string) {
    return this.database.transaction(async (client) => {
      const { rows } = await client.query<UserRow>('UPDATE observe.users SET name=$2, password_hash=COALESCE($3,password_hash) WHERE id=$1 AND enabled AND ($4::text IS NULL OR password_hash=$4) RETURNING *', [id, name, passwordHash, expectedHash ?? null])
      if (!rows[0]) throw new WorkspaceError({ statusCode: 401, statusMessage: 'Your account changed. Sign in again.' })
      if (passwordHash) await client.query('UPDATE observe.auth_sessions SET revoked_at=now() WHERE user_id=$1', [id])
      return mapUser(rows[0]!)
    })
  }

  async createSession(userId: string, tokenHash: string, userAgent: string) {
    return this.database.transaction(async (client) => {
      const sessionId = randomUUID()
      const { rows } = await client.query('INSERT INTO observe.auth_sessions(id,user_id,expires_at,user_agent) SELECT $1,id,now()+interval \'30 days\',$3 FROM observe.users WHERE id=$2 AND enabled RETURNING expires_at', [sessionId, userId, userAgent.slice(0, 300)])
      if (!rows[0]) throw new WorkspaceError({ statusCode: 401, statusMessage: 'Account unavailable' })
      await client.query('INSERT INTO observe.auth_refresh_tokens(token_hash,session_id) VALUES($1,$2)', [tokenHash, sessionId])
      const user = await client.query<UserRow>('UPDATE observe.users SET last_sign_in_at=now() WHERE id=$1 RETURNING *', [userId])
      // Opportunistic cleanup keeps session, replay-detection and throttle records bounded.
      await client.query('DELETE FROM observe.auth_sessions WHERE expires_at < now() - interval \'1 day\'')
      await client.query('DELETE FROM observe.auth_throttles WHERE resets_at < now()')
      return { user: mapUser(user.rows[0]!), sessionId, expiresAt: rows[0].expires_at as Date }
    })
  }

  async rotateSession(tokenHash: string, nextHash: string) {
    return this.database.transaction(async (client) => {
      const { rows } = await client.query('SELECT t.consumed_at,s.id,s.user_id,s.expires_at,s.revoked_at FROM observe.auth_refresh_tokens t JOIN observe.auth_sessions s ON s.id=t.session_id WHERE t.token_hash=$1 FOR UPDATE OF s,t', [tokenHash])
      const record = rows[0]
      if (!record || record.revoked_at || record.expires_at <= new Date()) return undefined
      if (record.consumed_at) {
        await client.query('UPDATE observe.auth_sessions SET revoked_at=now() WHERE id=$1', [record.id])
        return undefined
      }
      const user = await client.query<UserRow>('SELECT * FROM observe.users WHERE id=$1 AND enabled', [record.user_id])
      if (!user.rows[0]) return undefined
      await client.query('UPDATE observe.auth_refresh_tokens SET consumed_at=now() WHERE token_hash=$1', [tokenHash])
      await client.query('INSERT INTO observe.auth_refresh_tokens(token_hash,session_id) VALUES($1,$2)', [nextHash, record.id])
      return { user: mapUser(user.rows[0]), sessionId: record.id as string, expiresAt: record.expires_at as Date }
    })
  }

  async sessionUser(userId: string, sessionId: string) {
    const { rows } = await this.database.query<UserRow>('SELECT u.* FROM observe.users u JOIN observe.auth_sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.enabled AND s.revoked_at IS NULL AND s.expires_at>now()', [userId, sessionId])
    return rows[0] ? mapUser(rows[0]) : undefined
  }

  async revokeSession(userId: string, sessionId?: string) {
    await this.database.query('UPDATE observe.auth_sessions SET revoked_at=now() WHERE user_id=$1 AND ($2::uuid IS NULL OR id=$2)', [userId, sessionId ?? null])
  }

  async revokeRefresh(tokenHash: string) {
    await this.database.query('UPDATE observe.auth_sessions SET revoked_at=now() WHERE id IN (SELECT session_id FROM observe.auth_refresh_tokens WHERE token_hash=$1)', [tokenHash])
  }

  async listSessions(userId: string, current: string) {
    const { rows } = await this.database.query('SELECT id,created_at,expires_at,user_agent FROM observe.auth_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC', [userId])
    return rows.map(row => ({ id: row.id as string, createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(), current: row.id === current, userAgent: row.user_agent as string }))
  }

  async resetThrottle(key: string) {
    await this.database.query('DELETE FROM observe.auth_throttles WHERE key=$1', [key])
  }

  async throttle(key: string, limit: number) {
    const { rows } = await this.database.query('INSERT INTO observe.auth_throttles(key,attempts,resets_at) VALUES($1,1,now()+interval \'15 minutes\') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_throttles.resets_at<now() THEN 1 ELSE auth_throttles.attempts+1 END,resets_at=CASE WHEN auth_throttles.resets_at<now() THEN now()+interval \'15 minutes\' ELSE auth_throttles.resets_at END RETURNING attempts', [key])
    if (rows[0]!.attempts > limit) throw new WorkspaceError({ statusCode: 429, statusMessage: 'Too many attempts. Try again in 15 minutes.' })
  }

  async oauthUser(provider: AuthProvider, subject: string, email: string, name: string, allowSignup: boolean, linkUserId?: string) {
    return this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended(\'observe:users\', 0))')
      const identity = await client.query<UserRow>('SELECT u.* FROM observe.users u JOIN observe.auth_identities i ON i.user_id=u.id WHERE i.provider=$1 AND i.subject=$2', [provider, subject])
      if (identity.rows[0]) {
        if (!identity.rows[0].enabled || (linkUserId && identity.rows[0].id !== linkUserId)) throw conflict('Identity is unavailable')
        return mapUser(identity.rows[0])
      }
      let user: UserRow | undefined
      if (linkUserId) user = (await client.query<UserRow>('SELECT * FROM observe.users WHERE id=$1 AND enabled', [linkUserId])).rows[0]
      else if (allowSignup) {
        if ((await client.query('SELECT 1 FROM observe.users WHERE email=$1', [email])).rowCount) throw conflict('Sign in to your existing account and link this provider from your profile')
        // Only local setup may create the first administrator.
        if (!(await client.query('SELECT 1 FROM observe.users LIMIT 1')).rowCount) throw conflict('An administrator must complete initial setup first')
        user = (await client.query<UserRow>('INSERT INTO observe.users(id,email,name,role) VALUES($1,$2,$3,\'viewer\') RETURNING *', [randomUUID(), email, name])).rows[0]
      }
      if (!user) throw new WorkspaceError({ statusCode: 403, statusMessage: 'Ask an administrator for an account, then link your provider from your profile' })
      await client.query('INSERT INTO observe.auth_identities(provider,subject,user_id) VALUES($1,$2,$3)', [provider, subject, user.id])
      return mapUser(user)
    })
  }

  async linkedProviders(userId: string) {
    const { rows } = await this.database.query('SELECT provider FROM observe.auth_identities WHERE user_id=$1 ORDER BY provider', [userId])
    return rows.map(row => row.provider as AuthProvider)
  }
}
