import { test } from 'node:test'
import assert from 'node:assert/strict'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, getRequestURL } from 'h3'
import { assertMutationRequest } from '~~/server/http/request-security'
import { clientIp, cookieOptions, oauthCallbackUrl, writeSession } from '~~/server/http/authentication'
import type { SessionCredentials } from '~~/server/features/auth/domain/authentication.ports'

function request(headers: Record<string, string> = {}, method = 'POST') {
  const input = new IncomingMessage(new Socket())
  input.method = method
  input.url = '/api/observe/auth/sign-in'
  input.headers = { host: 'observed.example.test', ...headers }
  return createEvent(input, new ServerResponse(input))
}

test('request security follows the current host and scheme without deployment settings', () => {
  const local = request({ host: 'localhost:3000', origin: 'http://localhost:3000' })
  assert.doesNotThrow(() => assertMutationRequest(local))
  assert.equal(cookieOptions(local).secure, false)
  assert.equal(oauthCallbackUrl(local, 'google'), 'http://localhost:3000/api/observe/auth/oauth/google/callback')
  const secure = request({ 'x-forwarded-proto': 'https', 'origin': 'https://observed.example.test' })
  assert.equal(getRequestURL(secure).origin, 'https://observed.example.test')
  assert.doesNotThrow(() => assertMutationRequest(secure))
  assert.equal(cookieOptions(secure).secure, true)
  assert.equal(oauthCallbackUrl(secure, 'microsoft'), 'https://observed.example.test/api/observe/auth/oauth/microsoft/callback')
  assert.equal(cookieOptions(secure).httpOnly, true)
  assert.equal(cookieOptions(secure).sameSite, 'lax')
  assert.equal(clientIp(request({ 'x-forwarded-for': '203.0.113.10' })), 'unknown')
})

test('cookie mutations reject cross-site, foreign origins and requests without same-site evidence', () => {
  for (const headers of [
    { origin: 'https://foreign.example.test' },
    { origin: 'null' },
    { 'sec-fetch-site': 'cross-site', 'authorization': 'Bearer token' },
    {}
  ]) assert.throws(() => assertMutationRequest(request(headers)), (error: unknown) => (error as { statusCode: number }).statusCode === 403)
  assert.doesNotThrow(() => assertMutationRequest(request({ 'sec-fetch-site': 'same-origin' })))
  assert.doesNotThrow(() => assertMutationRequest(request({ authorization: 'Bearer token' })))
  assert.doesNotThrow(() => assertMutationRequest(request({}, 'GET')))
})

test('sign-in writes secure HTTP-only session cookies for an HTTPS request', () => {
  const event = request({ 'x-forwarded-proto': 'https' })
  writeSession(event, { user: {}, accessToken: 'access', refreshToken: 'refresh', expiresAt: new Date(Date.now() + 60000) } as SessionCredentials)
  const cookies = event.node.res.getHeader('set-cookie') as string[]
  assert.equal(cookies.length, 2)
  assert.ok(cookies.every(cookie => cookie.includes('Secure') && cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')))
  assert.ok(cookies.some(cookie => cookie.startsWith('observe_refresh=') && cookie.includes('Path=/api/observe/auth')))
})
