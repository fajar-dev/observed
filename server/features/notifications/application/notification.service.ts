import type { NotificationUpdate } from '#shared/domain/notification'
import type { NotificationRepository } from '../domain/notification.repository'

export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  snapshot(userId: string) { return this.repository.snapshot(userId) }
  markRead(userId: string, target: { id: string } | { through: string }) { return this.repository.markRead(userId, target) }

  async update(userId: string, after?: string): Promise<NotificationUpdate> {
    const snapshot = await this.repository.snapshot(userId)
    // A first connection initializes the inbox without replaying historical toasts.
    const events = after === undefined ? [] : await this.repository.after(userId, after, snapshot.cursor)
    return { ...snapshot, cursor: events.length === 100 ? events.at(-1)!.sequence : snapshot.cursor, events }
  }
}
