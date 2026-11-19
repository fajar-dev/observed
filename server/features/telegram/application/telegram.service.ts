import { WorkspaceError } from '~~/server/domain/workspace-error'
import type { TelegramTransport, WorkspaceRepository, SecretVault } from '~~/server/domain/ports'

import type { StoredTelegramDestination } from '~~/server/domain/workspace-entities'

function publicDestination({ id, name, chatId, ciphertext }: StoredTelegramDestination & { id: string }) {
  return { id, name, chatId, hasToken: Boolean(ciphertext) }
}

export class TelegramService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly vault: SecretVault,
    private readonly transport: TelegramTransport
  ) {}

  async list() {
    return (await this.repository.list('telegramDestinations')).map(publicDestination)
  }

  async save(input: { name: string, chatId: string, token?: string }, id?: string) {
    const { token, ...data } = input
    const ciphertext = token ? this.vault.encrypt(token) : undefined
    if (id) {
      return publicDestination(await this.repository.update('telegramDestinations', id, { ...data, ...(ciphertext ? { ciphertext } : {}) }))
    }
    if (!ciphertext) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Enter a Telegram bot token' })
    return publicDestination(await this.repository.create('telegramDestinations', { ...data, ciphertext }))
  }

  async send(id: string, text: string) {
    const settings = await this.repository.get('telegramDestinations', id)
    const token = this.vault.decrypt(settings.ciphertext)
    await this.transport.send(token, settings.chatId, text)
  }

  async deleteDestination(id: string) {
    if (await this.repository.isReferenced('telegramDestinations', id)) {
      throw new WorkspaceError({ statusCode: 409, statusMessage: 'Remove this destination from its alert rules before deleting it' })
    }
    await this.repository.delete('telegramDestinations', id)
  }
}
