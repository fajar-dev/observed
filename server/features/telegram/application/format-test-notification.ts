import { product } from '#shared/config/product'

export function formatTelegramTestNotification(): string {
  return `${product.name} · Telegram connection test\n\nThis is a test message for structural sensor alerts.`
}
