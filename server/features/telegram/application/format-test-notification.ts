import { product } from '#shared/config/product'

export function formatTelegramTestNotification(): string {
  return `${product.name} · Tes koneksi Telegram\n\nNotifikasi alert sensor struktur akan dikirim ke chat ini.`
}
