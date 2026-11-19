import { z } from 'zod'
import { name } from './common'

export const telegramDestinationSchema = z.object({
  name,
  chatId: z.string().trim().regex(/^(?:-?\d{1,20}|@[A-Za-z0-9_]{5,32})$/, 'Enter a numeric chat ID or @username.'),
  token: z.string().trim().regex(/^\d{4,20}:[A-Za-z0-9_-]{20,100}$/, 'Enter a valid Telegram bot token.').optional()
})

export type TelegramDestinationInput = z.infer<typeof telegramDestinationSchema>

export type TelegramDestination = { id: string, name: string, chatId: string, hasToken: boolean }
