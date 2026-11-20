import { z } from 'zod'
import type { AlertRuleInput } from './alert-rule'

export type AlertNotificationInput = {
  alertRuleId: string
  alertName: string
  sourceName: string
  state: 'firing' | 'recovered'
  value: number | null
  threshold: number
  operator: AlertRuleInput['operator']
  severity?: AlertRuleInput['severity']
  summary?: string
  occurredAt: string
}
export type AlertNotification = AlertNotificationInput & { id: string, sequence: string, readAt: string | null }
export type NotificationSnapshot = { items: AlertNotification[], unread: number, cursor: string }
export type NotificationUpdate = NotificationSnapshot & { events: AlertNotification[] }
export const notificationCursor = z.string().regex(/^\d{1,19}$/).refine(value => /^\d{1,19}$/.test(value) && BigInt(value) <= 9223372036854775807n)
export const notificationReadSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({ through: notificationCursor })
])
