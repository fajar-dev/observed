import type { AuthProvider, AuthSession, AuthUser, UserInput } from '#shared/domain/auth'

export type UserRecord = AuthUser & { passwordHash: string | null }
export type SessionCredentials = SessionRecord & { accessToken: string, refreshToken: string }
export type SessionRecord = { user: AuthUser, sessionId: string, expiresAt: Date }
export interface AuthenticationRepository {
  isSetupComplete(): Promise<boolean>
  findUser(email: string): Promise<UserRecord | undefined>
  getUser(id: string): Promise<UserRecord | undefined>
  listUsers(): Promise<AuthUser[]>
  saveUser(input: UserInput, passwordHash: string | null, id?: string, actorId?: string, first?: boolean): Promise<AuthUser>
  deleteUser(id: string, actorId: string): Promise<void>
  updateProfile(id: string, name: string, passwordHash?: string, expectedHash?: string): Promise<AuthUser>
  createSession(userId: string, tokenHash: string, userAgent: string): Promise<SessionRecord>
  rotateSession(tokenHash: string, nextHash: string): Promise<SessionRecord | undefined>
  sessionUser(userId: string, sessionId: string): Promise<AuthUser | undefined>
  revokeSession(userId: string, sessionId?: string): Promise<void>
  revokeRefresh(tokenHash: string): Promise<void>
  listSessions(userId: string, current: string): Promise<AuthSession[]>
  resetThrottle(key: string): Promise<void>
  throttle(key: string, limit: number): Promise<void>
  oauthUser(provider: AuthProvider, subject: string, email: string, name: string, allowSignup: boolean, linkUserId?: string): Promise<AuthUser>
  linkedProviders(userId: string): Promise<AuthProvider[]>
}
export interface PasswordHasher { hash(password: string): Promise<string>, verify(password: string, hash: string): Promise<boolean> }
export interface AccessTokens { issue(userId: string, sessionId: string): Promise<string>, verify(token: string): Promise<{ userId: string, sessionId: string }> }

export type OAuthFlow = { provider: AuthProvider, verifier: string, state: string, nonce: string, expiresAt: number, linkUserId?: string, linkSessionId?: string }
