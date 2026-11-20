import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardRefreshOptions, dashboardRefreshSchema, dashboardRefreshSeconds, refreshOptionsFor } from '#shared/domain/dashboard-refresh'
import { dashboardSchema } from '#shared/domain/dashboard'

test('dashboard refresh supports all presets, Auto and persisted custom intervals', () => {
  assert.deepEqual(dashboardRefreshOptions.map(option => option.label), ['Off', 'Auto', '5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'])
  for (const { value } of dashboardRefreshOptions) {
    assert.equal(dashboardSchema.parse({ name: 'Bridge', description: '', panels: [], refresh: value, range: '1h' }).refresh, value)
  }
  assert.ok(refreshOptionsFor(15).some(option => option.value === 15 && option.label === '15s'))
  assert.equal(refreshOptionsFor(0).length, 12)
  for (const invalid of [-1, 1, 4, 5.5, 86401, '5s', null]) assert.equal(dashboardRefreshSchema.safeParse(invalid).success, false)
})

test('Auto adapts to relative and absolute ranges while Off and fixed intervals stay stable', () => {
  assert.equal(dashboardRefreshSeconds(0, { range: '1h' }), 0)
  assert.equal(dashboardRefreshSeconds(86400, { range: '5m' }), 86400)
  assert.equal(dashboardRefreshSeconds('auto', { range: '5m' }), 5)
  assert.equal(dashboardRefreshSeconds('auto', { range: '1h' }), 12)
  assert.equal(dashboardRefreshSeconds('auto', { range: '24h' }), 288)
  assert.equal(dashboardRefreshSeconds('auto', { range: '1h', from: '2026-11-20T00:00:00Z', to: '2026-11-20T06:00:00Z' }), 72)
  assert.equal(dashboardRefreshSeconds('auto', { range: '5m', from: 'invalid', to: 'invalid' }), 5)
  assert.equal(dashboardRefreshSeconds('auto', { range: '1h', from: '2025-01-01T00:00:00Z', to: '2026-11-20T00:00:00Z' }), 86400)
})
