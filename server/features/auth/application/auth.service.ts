import { createHash, randomBytes } from 'node:crypto'
import type { AuthProvider, UserInput } from '#shared/domain/auth'
import type { AccessTokens, AuthenticationRepository, PasswordHasher, SessionRecord } from '~~/server/features/auth/domain/authentication.ports'
import { WorkspaceError } from '~~/server/domain/workspace-error'

export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex')
const unauthorized = () => new WorkspaceError({ statusCode: 401, statusMessage: 'Invalid or expired session' })

export class AuthService {
  private dummyHash?: Promise<string>
  constructor(private readonly repository: AuthenticationRepository, private readonly passwords: PasswordHasher, private readonly tokens: AccessTokens, private readonly allowOAuthSignup = false) {}

  async configuration(providers: AuthProvider[]) {
    return { setupRequired: !await this.repository.isSetupComplete(), providers }
  }

  async assertSetupOpen() {
    if (await this.repository.isSetupComplete()) throw new WorkspaceError({ statusCode: 409, statusMessage: 'Initial setup is already complete. Sign in with your account.' })
  }

  async setup(input: { email: string, name: string, password: string }, ip: string, userAgent: string) {
    await this.assertSetupOpen()
    await this.repository.throttle('setup:' + tokenHash(ip), 5)
    const user = await this.repository.saveUser({ ...input, role: 'admin', enabled: true }, await this.passwords.hash(input.password), undefined, undefined, true)
    return this.createSession(user.id, userAgent)
  }

  async signIn(email: string, password: string, ip: string, userAgent: string) {
    await this.repository.throttle('signin-ip:' + tokenHash(ip), 60)
    await this.repository.throttle('signin-email:' + tokenHash(email), 10)
    const user = await this.repository.findUser(email)
    this.dummyHash ??= this.passwords.hash(randomBytes(32).toString('base64url'))
    const hash = user?.passwordHash || await this.dummyHash
    const valid = await this.passwords.verify(password, hash)
    if (!user?.enabled || !user.passwordHash || !valid) throw new WorkspaceError({ statusCode: 401, statusMessage: 'Email or password is incorrect' })
    await this.repository.resetThrottle('signin-email:' + tokenHash(email))
    return this.createSession(user.id, userAgent)
  }

  private async credentials(record: SessionRecord, refreshToken: string) {
    return { ...record, accessToken: await this.tokens.issue(record.user.id, record.sessionId), refreshToken }
  }

  async createSession(userId: string, userAgent: string) {
    const token = randomBytes(48).toString('base64url')
    return this.credentials(await this.repository.createSession(userId, tokenHash(token), userAgent), token)
  }

  async refresh(token: string) {
    if (!/^[A-Za-z0-9_-]{64}$/.test(token)) throw unauthorized()
    const next = randomBytes(48).toString('base64url')
    const session = await this.repository.rotateSession(tokenHash(token), tokenHash(next))
    if (!session) throw unauthorized()
    return this.credentials(session, next)
  }

  async authenticate(token: string) {
    let claims: { userId: string, sessionId: string }
    try {
      claims = await this.tokens.verify(token)
    } catch {
      throw unauthorized()
    }
    const user = await this.repository.sessionUser(claims.userId, claims.sessionId)
    if (!user) throw unauthorized()
    return { user, sessionId: claims.sessionId }
  }

  async signOut(refreshToken?: string) {
    if (refreshToken) await this.repository.revokeRefresh(tokenHash(refreshToken))
  }

  async saveUser(input: UserInput, actorId: string, id?: string) {
    if (!id && !input.password) throw new WorkspaceError({ statusCode: 422, statusMessage: 'A password is required for new users' })
    return this.repository.saveUser(input, input.password ? await this.passwords.hash(input.password) : null, id, actorId)
  }

  async updateProfile(userId: string, input: { name: string, currentPassword?: string, password?: string }) {
    let expectedHash: string | undefined
    if (input.password) {
      await this.repository.throttle('password-change:' + userId, 10)
      const user = await this.repository.getUser(userId)
      if (!user?.passwordHash || !input.currentPassword || !await this.passwords.verify(input.currentPassword, user.passwordHash)) {
        throw new WorkspaceError({ statusCode: 422, statusMessage: 'Current password is incorrect. OAuth-only accounts must ask an administrator to set a password.' })
      }
      expectedHash = user.passwordHash
    }
    return this.repository.updateProfile(userId, input.name, input.password ? await this.passwords.hash(input.password) : undefined, expectedHash)
  }

  listUsers() { return this.repository.listUsers() }
  deleteUser(id: string, actorId: string) { return this.repository.deleteUser(id, actorId) }
  listSessions(userId: string, current: string) { return this.repository.listSessions(userId, current) }
  revokeSession(userId: string, id?: string) { return this.repository.revokeSession(userId, id) }
  linkedProviders(userId: string) { return this.repository.linkedProviders(userId) }
  sessionUser(userId: string, sessionId: string) { return this.repository.sessionUser(userId, sessionId) }
  oauthUser(provider: AuthProvider, subject: string, email: string, name: string, linkUserId?: string) {
    return this.repository.oauthUser(provider, subject, email, name, this.allowOAuthSignup, linkUserId)
  }

  checkOAuthLimit(ip: string) { return this.repository.throttle('oauth:' + tokenHash(ip), 30) }
}
