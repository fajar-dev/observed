import { WorkspaceError } from '../../core/workspace-error'
import type { AlertRule } from '#shared/domain/alert-rule'
import type { TelegramTransport, WorkspaceStore, SecretVault } from '../../core/ports'

type StoredTelegramDestination = { name: string, chatId: string, ciphertext: string }

function publicDestination({ id, name, chatId, ciphertext }: StoredTelegramDestination & { id: string }) {
  return { id, name, chatId, hasToken: Boolean(ciphertext) }
}

export class TelegramService {
  constructor(
    private readonly store: WorkspaceStore,
    private readonly vault: SecretVault,
    private readonly transport: TelegramTransport
  ) {}

  async list() {
    return (await this.store.list<StoredTelegramDestination>('telegramDestinations')).map(publicDestination)
  }

  async save(input: { name: string, chatId: string, token?: string }, id?: string) {
    const { token, ...data } = input
    const ciphertext = token ? this.vault.encrypt(token) : undefined
    if (id) {
      return publicDestination(await this.store.update<StoredTelegramDestination>('telegramDestinations', id, { ...data, ...(ciphertext ? { ciphertext } : {}) }))
    }
    if (!ciphertext) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Enter a Telegram bot token' })
    return publicDestination(await this.store.create('telegramDestinations', { ...data, ciphertext }))
  }

  async send(id: string, text: string) {
    const settings = await this.store.get<StoredTelegramDestination>('telegramDestinations', id)
    const token = this.vault.decrypt(settings.ciphertext)
    await this.transport.send(token, settings.chatId, text)
  }

  async deleteDestination(id: string) {
    const rules = await this.store.list<AlertRule>('alertRules')
    if (rules.some(rule => rule.telegramDestinationIds?.includes(id))) {
      throw new WorkspaceError({ statusCode: 409, statusMessage: 'Remove this destination from its alert rules before deleting it' })
    }
    await this.store.delete('telegramDestinations', id)
  }
}
