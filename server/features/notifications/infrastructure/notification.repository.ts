import type { AlertNotification, NotificationSnapshot } from '#shared/domain/notification'
import type { NotificationRepository } from '../domain/notification.repository'
import type { PostgresDatabase } from '~~/server/platform/database/database'

const item = `n.payload || jsonb_build_object('id', n.id, 'sequence', n.sequence::text, 'readAt', r.read_at)`

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async snapshot(userId: string): Promise<NotificationSnapshot> {
    const { rows } = await this.database.query<{ items: AlertNotification[], unread: string, cursor: string }>(`
      SELECT
        (SELECT COUNT(*)::text FROM observe.alert_notifications n LEFT JOIN observe.notification_reads r ON r.notification_id=n.id AND r.user_id=$1 WHERE r.notification_id IS NULL) AS unread,
        (SELECT COALESCE(MAX(sequence),0)::text FROM observe.alert_notifications) AS cursor,
        COALESCE((SELECT jsonb_agg(value ORDER BY sequence DESC) FROM (
          SELECT ${item} AS value, n.sequence FROM observe.alert_notifications n
          LEFT JOIN observe.notification_reads r ON r.notification_id=n.id AND r.user_id=$1
          ORDER BY n.sequence DESC LIMIT 50
        ) recent),'[]'::jsonb) AS items`, [userId])
    return { items: rows[0]!.items, unread: Number(rows[0]!.unread), cursor: rows[0]!.cursor }
  }

  async after(userId: string, cursor: string, through: string) {
    const { rows } = await this.database.query<{ value: AlertNotification }>(`
      SELECT ${item} AS value FROM observe.alert_notifications n
      LEFT JOIN observe.notification_reads r ON r.notification_id=n.id AND r.user_id=$1
      WHERE n.sequence>$2::bigint AND n.sequence<=$3::bigint ORDER BY n.sequence LIMIT 100`, [userId, cursor, through])
    return rows.map(row => row.value)
  }

  async markRead(userId: string, target: { id: string } | { through: string }) {
    await this.database.query(`INSERT INTO observe.notification_reads(user_id,notification_id)
      SELECT $1,id FROM observe.alert_notifications WHERE ${'id' in target ? 'id=$2::uuid' : 'sequence<=$2::bigint'}
      ON CONFLICT DO NOTHING`, [userId, 'id' in target ? target.id : target.through])
  }
}
