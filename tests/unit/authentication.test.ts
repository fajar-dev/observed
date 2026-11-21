import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hkdfSync, randomBytes, randomUUID } from 'node:crypto'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import { ScryptPasswordHasher } from '~~/server/features/auth/infrastructure/scrypt-password-hasher'
import { JwtAccessTokens } from '~~/server/features/auth/infrastructure/jwt-access-tokens'
import { OidcProviders } from '~~/server/features/auth/infrastructure/oidc-providers'
import { isAllowed, isPublicAuthRoute } from '~~/server/features/auth/domain/access-policy'
import { notificationPreferencesSchema, setupSchema, userInputSchema } from '#shared/domain/auth'

test('authorization separates viewer, editor and administrator capabilities', () => {
  for (const role of ['viewer', 'editor', 'admin'] as const) {
    assert.ok(isAllowed(role, 'dashboards/123', 'GET'))
    assert.ok(isAllowed(role, 'queries', 'POST'))
    assert.ok(isAllowed(role, 'variables/resolve', 'POST'))
    assert.ok(isAllowed(role, 'auth/notification-preferences', 'PUT'))
    assert.equal(isAllowed(role, 'auth/notification-preferences', 'GET'), false)
    assert.equal(isAllowed(role, 'dashboards', 'POST'), role !== 'viewer')
    assert.equal(isAllowed(role, 'alert-rules/123/evaluate', 'POST'), role !== 'viewer')
    assert.equal(isAllowed(role, 'data-sources', 'POST'), role === 'admin')
    assert.equal(isAllowed(role, 'telegram-destinations/123/test', 'POST'), role === 'admin')
    assert.equal(isAllowed(role, 'users', 'GET'), role === 'admin')
    assert.equal(isAllowed(role, 'users/123', 'PUT'), role === 'admin')
  }
  assert.equal(isAllowed('viewer', 'auth/future-admin-endpoint', 'GET'), false)
  assert.equal(isAllowed('editor', 'future-admin-endpoint', 'GET'), false)
  assert.ok(isPublicAuthRoute('auth/sign-in', 'POST'))
  assert.ok(isPublicAuthRoute('auth/oauth/google/callback', 'GET'))
  assert.equal(isPublicAuthRoute('auth/me', 'GET'), false)
  assert.equal(isPublicAuthRoute('auth/profile', 'PUT'), false)
  assert.equal(isPublicAuthRoute('auth/oauth/unknown', 'GET'), false)
})

test('password hashes are salted and incorrect or malformed passwords fail verification', async () => {
  const hasher = new ScryptPasswordHasher()
  const password = 'a-long-password-for-tests'
  const first = await hasher.hash(password)
  assert.notEqual(first, await hasher.hash(password))
  assert.ok(await hasher.verify(password, first))
  assert.equal(await hasher.verify('incorrect', first), false)
  assert.equal(await hasher.verify(password, 'invalid'), false)
  assert.equal(userInputSchema.safeParse({ name: 'Name', email: 'test@example.test', role: 'admin', password: 'short' }).success, false)
  assert.equal(setupSchema.safeParse({ name: 'Name', email: 'test@example.test', password: 'short' }).success, false)
  assert.equal(setupSchema.safeParse({ name: 'Name', email: 'test@example.test', password }).success, true)
})

test('JWTs enforce signature issuer audience expiry and session claims', async () => {
  const secret = randomBytes(32).toString('base64')
  const tokens = new JwtAccessTokens(secret)
  const userId = randomUUID(), sessionId = randomUUID()
  const token = await tokens.issue(userId, sessionId)
  assert.deepEqual(await tokens.verify(token), { userId, sessionId })
  await assert.rejects(new JwtAccessTokens(randomBytes(32).toString('base64')).verify(token))
  await assert.rejects(tokens.verify(token + 'tampered'))
  const key = new Uint8Array(hkdfSync('sha256', Buffer.from(secret, 'base64'), 'observe-auth', 'jwt-access-v1', 32))
  for (const [issuer, audience, expiry] of [['wrong', 'observe-api', '5m'], ['observe', 'other', '5m'], ['observe', 'observe-api', '-1s']]) {
    const invalid = await new SignJWT({ sid: sessionId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setSubject(userId).setIssuer(issuer!).setAudience(audience!).setExpirationTime(expiry!).sign(key)
    await assert.rejects(tokens.verify(invalid))
  }
})

test('OIDC validates PKCE state nonce and verified Google email using a simulated provider', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  let nonce = '', verified = true, grantCalls = 0
  let signingKey = privateKey
  const fakeFetch: NonNullable<ConstructorParameters<typeof OidcProviders>[1]> = async (_url, init) => {
    const url = String(_url)
    if (url.includes('.well-known')) {
      return Response.json({
        issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/authorize',
        token_endpoint: 'https://accounts.google.com/token', jwks_uri: 'https://accounts.google.com/jwks',
        response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256']
      })
    }
    if (url.endsWith('/jwks')) return Response.json({ keys: [{ ...jwk, kid: 'test-key', use: 'sig', alg: 'RS256' }] })
    if (url.endsWith('/token')) {
      grantCalls++
      const params = new URLSearchParams(String(init?.body))
      assert.ok(params.get('code_verifier'))
      assert.equal(params.get('redirect_uri'), 'https://observe.example.test/api/observe/auth/oauth/google/callback')
      const idToken = await new SignJWT({ nonce, email: 'person@example.test', email_verified: verified, name: 'Person' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer('https://accounts.google.com').setAudience('test-client').setSubject('provider-subject').setIssuedAt().setExpirationTime('5m').sign(signingKey)
      return Response.json({ access_token: 'provider-token', token_type: 'Bearer', id_token: idToken })
    }
    throw new Error('Unexpected provider URL')
  }
  const providers = new OidcProviders({ OBSERVE_GOOGLE_ENABLED: 'true', OBSERVE_GOOGLE_CLIENT_ID: 'test-client', OBSERVE_GOOGLE_CLIENT_SECRET: 'test-secret' }, fakeFetch)
  const callback = 'https://observe.example.test/api/observe/auth/oauth/google/callback'
  const { flow, url } = await providers.start('google', callback)
  nonce = flow.nonce
  assert.equal(new URL(url).searchParams.get('code_challenge_method'), 'S256')
  assert.ok(new URL(url).searchParams.get('code_challenge'))
  const success = new URL(callback + '?code=test-code&state=' + flow.state)
  assert.equal((await providers.finish('google', success, flow, callback)).subject, 'provider-subject')
  await assert.rejects(providers.finish('google', new URL(callback + '?code=bad&state=wrong'), flow, callback))
  assert.equal(grantCalls, 1)
  nonce = 'wrong-nonce'
  await assert.rejects(providers.finish('google', success, flow, callback))
  nonce = flow.nonce
  verified = false
  await assert.rejects(providers.finish('google', success, flow, callback))
  verified = true
  signingKey = (await generateKeyPair('RS256')).privateKey
  await assert.rejects(providers.finish('google', success, flow, callback))
  await assert.rejects(providers.start('microsoft', callback))
  await assert.rejects(providers.finish('google', success, { ...flow, expiresAt: 0 }, callback))
})

test('Microsoft OIDC restricts tenant and validates signed ID tokens before returning an identity', async () => {
  const tenant = randomUUID()
  const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  let nonce = '', returnedTenant = tenant
  const fakeFetch: NonNullable<ConstructorParameters<typeof OidcProviders>[1]> = async (input) => {
    const url = String(input)
    if (url.includes('.well-known')) return Response.json({
      issuer, authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token', jwks_uri: issuer + '/jwks',
      response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256']
    })
    if (url.endsWith('/jwks')) return Response.json({ keys: [{ ...jwk, kid: 'microsoft-test', use: 'sig', alg: 'RS256' }] })
    const idToken = await new SignJWT({ nonce, tid: returnedTenant, email: 'member@example.test', name: 'Member' })
      .setProtectedHeader({ alg: 'RS256', kid: 'microsoft-test' }).setIssuer(issuer).setAudience('microsoft-test-client').setSubject('microsoft-subject').setIssuedAt().setExpirationTime('5m').sign(privateKey)
    return Response.json({ access_token: 'provider-access-token', token_type: 'Bearer', id_token: idToken })
  }
  const providers = new OidcProviders({
    OBSERVE_MICROSOFT_ENABLED: 'true', OBSERVE_MICROSOFT_CLIENT_ID: 'microsoft-test-client', OBSERVE_MICROSOFT_CLIENT_SECRET: 'test-secret', OBSERVE_MICROSOFT_TENANT_ID: tenant
  }, fakeFetch)
  const callback = 'https://observe.example.test/api/observe/auth/oauth/microsoft/callback'
  const { flow } = await providers.start('microsoft', callback)
  nonce = flow.nonce
  const url = new URL(callback + '?code=test&state=' + flow.state)
  assert.equal((await providers.finish('microsoft', url, flow, callback)).subject, 'microsoft-subject')
  returnedTenant = randomUUID()
  await assert.rejects(providers.finish('microsoft', url, flow, callback))
  await assert.rejects(new OidcProviders({ OBSERVE_MICROSOFT_ENABLED: 'true', OBSERVE_MICROSOFT_CLIENT_ID: 'id', OBSERVE_MICROSOFT_CLIENT_SECRET: 'secret', OBSERVE_MICROSOFT_TENANT_ID: 'common' }, fakeFetch).start('microsoft', callback))
})

test('notification preferences require an explicit boolean and cannot target another account', () => {
  assert.deepEqual(notificationPreferencesSchema.parse({ realtimeAlertToasts: false }), { realtimeAlertToasts: false })
  assert.deepEqual(notificationPreferencesSchema.parse({ realtimeAlertToasts: true }), { realtimeAlertToasts: true })
  for (const input of [{}, { realtimeAlertToasts: 'false' }, { realtimeAlertToasts: null }, { realtimeAlertToasts: false, userId: 'another-account' }]) {
    assert.equal(notificationPreferencesSchema.safeParse(input).success, false)
  }
})
