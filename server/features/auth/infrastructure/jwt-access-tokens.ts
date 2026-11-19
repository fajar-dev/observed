import { hkdfSync } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { AccessTokens } from '~~/server/features/auth/domain/authentication.ports'

export class JwtAccessTokens implements AccessTokens {
  private readonly key: Uint8Array
  constructor(secret: string) {
    const decoded = Buffer.from(secret, 'base64')
    if (decoded.length !== 32) throw new Error('Set a 32-byte base64 OBSERVE_SECRET_KEY')
    this.key = new Uint8Array(hkdfSync('sha256', decoded, 'observe-auth', 'jwt-access-v1', 32))
  }

  issue(userId: string, sessionId: string) {
    return new SignJWT({ sid: sessionId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId).setIssuer('observe').setAudience('observe-api').setIssuedAt().setExpirationTime('10m').sign(this.key)
  }

  async verify(token: string) {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'], issuer: 'observe', audience: 'observe-api', typ: 'JWT' })
    if (!payload.sub || typeof payload.sid !== 'string') throw new Error('Invalid access token')
    return { userId: payload.sub, sessionId: payload.sid }
  }
}
