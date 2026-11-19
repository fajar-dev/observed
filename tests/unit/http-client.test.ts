import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WorkspaceApi } from '../../app/core/http/workspace-api'
import { SessionRenewal } from '../../app/core/http/session-renewal'
import type { ApiFetcher } from '../../app/core/http/workspace-api'

test('parallel requests share one session renewal and retry once', async () => {
  let refreshes = 0, valid = false
  const fetcher: ApiFetcher = async <T>(path: string) => {
    if (path === '/api/observe/auth/session') return { user: valid ? { id: 'user' } : null } as T
    if (path === '/api/observe/auth/refresh') {
      refreshes++
      await new Promise(resolve => setTimeout(resolve, 5))
      valid = true
      return {} as T
    }
    if (!valid) throw { statusCode: 401 }
    return { ok: true } as T
  }
  const renewal = new SessionRenewal(fetcher, action => action())
  const api = new WorkspaceApi(fetcher, () => renewal.renew(), async () => assert.fail('Valid sessions must not expire'))
  const results = await Promise.all(Array.from({ length: 8 }, () => api.request<{ ok: boolean }>('dashboards')))
  assert.equal(refreshes, 1)
  assert.ok(results.every(result => result.ok))
})

test('public authentication does not recursively refresh, while private auth routes renew', async () => {
  let renews = 0, expirations = 0
  const fetcher: ApiFetcher = async () => {
    throw { statusCode: 401 }
  }
  const api = new WorkspaceApi(fetcher, async () => {
    renews++
  }, async () => {
    expirations++
  })
  await assert.rejects(api.request('auth/sign-in', { method: 'POST' }))
  assert.equal(renews, 0)
  await assert.rejects(api.request('auth/profile', { method: 'PUT' }))
  assert.equal(renews, 1)
  assert.equal(expirations, 1)
})

test('network failures and cancelled requests do not expire a session', async () => {
  let expired = false
  const fetcher: ApiFetcher = async () => {
    throw { statusCode: 503 }
  }
  const api = new WorkspaceApi(fetcher, async () => assert.fail('Do not refresh a 503'), async () => {
    expired = true
  })
  await assert.rejects(api.request('dashboards'))
  assert.equal(expired, false)
})
