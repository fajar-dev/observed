import { WorkspaceError } from '~~/server/domain/workspace-error'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { SecretVault } from '~~/server/domain/ports'

export class CredentialVault implements SecretVault {
  private readonly key: Buffer

  constructor(key: string) {
    this.key = Buffer.from(key, 'base64')
    if (this.key.length !== 32) throw new WorkspaceError({ statusCode: 503, statusMessage: 'Set a 32-byte base64 OBSERVE_SECRET_KEY' })
  }

  encrypt(value: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
  }

  decrypt(value: string) {
    try {
      const data = Buffer.from(value, 'base64')
      const decipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12))
      decipher.setAuthTag(data.subarray(12, 28))
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')
    } catch {
      throw new WorkspaceError({ statusCode: 422, statusMessage: 'Saved credentials could not be decrypted. Enter them again in Configuration.' })
    }
  }
}
