import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AlertScheduler } from '~~/server/features/alerts/application/alert-scheduler'

test('scheduler coalesces overlapping ticks and waits for evaluation before shutdown', async () => {
  let calls = 0
  let finish!: () => void
  const scheduler = new AlertScheduler(() => {
    calls++
    return new Promise<void>((resolve) => {
      finish = resolve
    })
  }, () => assert.fail('Unexpected evaluation failure'))
  scheduler.start()
  scheduler.start()
  const first = scheduler.run()
  assert.equal(scheduler.run(), first)
  await Promise.resolve()
  assert.equal(calls, 1)
  let stopped = false
  const stopping = scheduler.stop().then(() => {
    stopped = true
  })
  await Promise.resolve()
  assert.equal(stopped, false)
  finish()
  await stopping
  await scheduler.run()
  assert.equal(calls, 1)
})

test('scheduler recovers after a failed evaluation and continues evaluating due rules', async () => {
  const failure = new Error('Temporary database outage')
  const errors: unknown[] = []
  let calls = 0
  const scheduler = new AlertScheduler(async () => {
    calls++
    if (calls === 1) throw failure
  }, error => errors.push(error))
  await scheduler.run()
  await scheduler.run()
  assert.deepEqual(errors, [failure])
  assert.equal(calls, 2)
  await scheduler.stop()
})
