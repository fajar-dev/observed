import type { UserPermissions } from '#shared/domain/permissions'
import { defaultPermissions } from '#shared/domain/permissions'
import type { Role } from '#shared/domain/auth'
import type { PermissionRepository } from '../domain/permission.repository'
import type { PostgresDatabase } from '~~/server/platform/database/database'
import { WorkspaceError } from '~~/server/domain/workspace-error'

export class PostgresPermissionRepository implements PermissionRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async get(userId: string) {
    const { rows } = await this.database.query<{ role: Role, permissions: UserPermissions }>(`
      SELECT u.role,jsonb_build_object(
        'dashboards',jsonb_build_object('scope',COALESCE(a.dashboard_scope,'none'),'access',COALESCE(a.dashboard_access,'view'),'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',dashboard_id,'access',access) ORDER BY dashboard_id) FROM observe.user_dashboard_permissions WHERE user_id=u.id),'[]'::jsonb)),
        'alerts',jsonb_build_object('scope',COALESCE(a.alert_scope,'none'),'access',COALESCE(a.alert_access,'view'),'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',alert_rule_id,'access',access) ORDER BY alert_rule_id) FROM observe.user_alert_permissions WHERE user_id=u.id),'[]'::jsonb))
      ) AS permissions FROM observe.users u LEFT JOIN observe.user_access a ON a.user_id=u.id WHERE u.id=$1`, [userId])
    if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'User not found' })
    return { role: rows[0].role, permissions: rows[0].role === 'admin' ? defaultPermissions(true) : rows[0].permissions }
  }

  async save(userId: string, permissions: UserPermissions) {
    await this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended(\'observe:users\',0))')
      const { rows } = await client.query('SELECT role FROM observe.users WHERE id=$1 FOR UPDATE', [userId])
      if (!rows[0]) throw new WorkspaceError({ statusCode: 404, statusMessage: 'User not found' })
      if (rows[0].role === 'admin') throw new WorkspaceError({ statusCode: 409, statusMessage: 'Administrators always have full access. Change the role before restricting permissions.' })
      const { dashboards, alerts } = permissions
      await client.query(`INSERT INTO observe.user_access(user_id,dashboard_scope,dashboard_access,alert_scope,alert_access) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(user_id) DO UPDATE SET dashboard_scope=$2,dashboard_access=$3,alert_scope=$4,alert_access=$5`, [userId, dashboards.scope, dashboards.access, alerts.scope, alerts.access])
      await client.query('DELETE FROM observe.user_dashboard_permissions WHERE user_id=$1', [userId])
      await client.query('DELETE FROM observe.user_alert_permissions WHERE user_id=$1', [userId])
      if (dashboards.scope !== 'none') await client.query('INSERT INTO observe.user_dashboard_permissions(user_id,dashboard_id,access) SELECT $1,id,access FROM jsonb_to_recordset($2::jsonb) AS grant_row(id uuid,access text)', [userId, JSON.stringify(dashboards.grants)])
      if (alerts.scope !== 'none') await client.query('INSERT INTO observe.user_alert_permissions(user_id,alert_rule_id,access) SELECT $1,id,access FROM jsonb_to_recordset($2::jsonb) AS grant_row(id uuid,access text)', [userId, JSON.stringify(alerts.grants)])
      // Expire cached client permissions as well as any active realtime streams.
      await client.query('UPDATE observe.auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [userId])
    })
  }
}
