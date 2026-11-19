import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { PasswordHasher } from '~~/server/features/auth/domain/authentication.ports'

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key))
  })
}
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16).toString('base64url')
    const key = await derive(password, salt)
    return `scrypt:${salt}:${key.toString('base64url')}`
  }

  async verify(password: string, encoded: string) {
    const [algorithm, salt, hash] = encoded.split(':')
    if (algorithm !== 'scrypt' || !salt || !hash) return false
    const expected = Buffer.from(hash, 'base64url')
    if (expected.length !== 64) return false
    const actual = await derive(password, salt)
    return timingSafeEqual(actual, expected)
  }
}
