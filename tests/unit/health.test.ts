import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HealthService } from '~~/server/features/health/application/health.service'

test('readiness checks database connectivity and does not expose failure details', async () => {
  assert.deepEqual(await new HealthService(async () => ({ rows: [{ ready: 1 }] })).check(), { status: 'ok' })
  assert.deepEqual(await new HealthService(async () => {
    throw new Error('private database connection details')
  }).check(), { status: 'unavailable' })
})
