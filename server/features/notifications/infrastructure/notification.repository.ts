import { WorkspaceError } from '~~/server/domain/workspace-error'
import type { AlertNotification, NotificationSnapshot } from '#shared/domain/notification'
import type { NotificationRepository } from '../domain/notification.repository'
import type { PostgresDatabase } from '~~/server/platform/database/database'

const item = `n.payload || jsonb_build_object('id', n.id, 'sequence', n.sequence::text, 'readAt', r.read_at)`

const visible = `EXISTS(SELECT 1 FROM observe.users u LEFT JOIN observe.user_access a ON a.user_id=u.id
  WHERE u.id=$1 AND u.enabled AND (u.role='admin' OR a.alert_scope='all'
    OR (a.alert_scope='selected' AND EXISTS(SELECT 1 FROM observe.user_alert_permissions g WHERE g.user_id=u.id AND g.alert_rule_id=n.alert_rule_id))))`

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async snapshot(userId: string): Promise<NotificationSnapshot> {
    const { rows } = await this.database.query<{ items: AlertNotification[], unread: string, cursor: string }>(`
      WITH visible AS (SELECT n.* FROM observe.alert_notifications n WHERE ${visible})
      SELECT
        (SELECT COUNT(*)::text FROM visible n LEFT JOIN observe.notification_reads r ON r.notification_id=n.id AND r.user_id=$1 WHERE r.notification_id IS NULL) AS unread,
        (SELECT COALESCE(MAX(sequence),0)::text FROM visible) AS cursor,
        COALESCE((SELECT jsonb_agg(value ORDER BY sequence DESC) FROM (
          SELECT ${item} AS value, n.sequence FROM visible n
          LEFT JOIN observe.notification_reads r ON r.notification_id=n.id AND r.user_id=$1
          ORDER BY n.sequence DESC LIMIT 50
        ) recent),'[]'::jsonb) AS items`, [userId])
    return { items: rows[0]!.items, unread: Number(rows[0]!.unread), cursor: rows[0]!.cursor }
  }

  async after(userId: string, cursor: string, through: string) {
    const { rows } = await this.database.query<{ value: AlertNotification }>(`
      SELECT ${item} AS value FROM observe.alert_notifications n
      LEFT JOIN observe.notification_reads r ON r.notification_id=n.id AND r.user_id=$1
      WHERE ${visible} AND n.sequence>$2::bigint AND n.sequence<=$3::bigint ORDER BY n.sequence LIMIT 100`, [userId, cursor, through])
    return rows.map(row => row.value)
  }

  async markRead(userId: string, target: { id: string } | { through: string }) {
    const result = await this.database.query(`INSERT INTO observe.notification_reads(user_id,notification_id)
      SELECT $1,n.id FROM observe.alert_notifications n WHERE ${visible} AND ${'id' in target ? 'n.id=$2::uuid' : 'n.sequence<=$2::bigint'}
      ON CONFLICT(user_id,notification_id) DO UPDATE SET read_at=observe.notification_reads.read_at RETURNING notification_id`, [userId, 'id' in target ? target.id : target.through])
    if ('id' in target && !result.rowCount) throw new WorkspaceError({ statusCode: 404, statusMessage: 'Notification not found' })
  }
}
