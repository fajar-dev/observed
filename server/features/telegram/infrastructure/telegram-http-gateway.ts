import { WorkspaceError } from '~~/server/domain/workspace-error'
import type { TelegramTransport } from '~~/server/domain/ports'
import { readRemote } from '~~/server/platform/http/remote-transport'

export class TelegramHttpGateway implements TelegramTransport {
  constructor(private readonly request = readRemote) {}
  async send(token: string, chatId: string, text: string) {
    try {
      const response = await this.request(new URL(`https://api.telegram.org/bot${token}/sendMessage`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text })
      })
      if (JSON.parse(response).ok !== true) throw new Error('Message rejected')
    } catch {
      throw new WorkspaceError({ statusCode: 502, statusMessage: 'Telegram delivery failed. Check the token, chat ID, and bot permissions.' })
    }
  }
}
