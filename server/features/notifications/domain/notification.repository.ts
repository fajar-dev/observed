import type { AlertNotification, NotificationSnapshot } from '#shared/domain/notification'

export interface NotificationRepository {
  snapshot(userId: string): Promise<NotificationSnapshot>
  after(userId: string, cursor: string, through: string): Promise<AlertNotification[]>
  markRead(userId: string, target: { id: string } | { through: string }): Promise<void>
}
