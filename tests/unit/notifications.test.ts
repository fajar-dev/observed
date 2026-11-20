import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notificationCursor, notificationReadSchema } from '#shared/domain/notification'
import type { NotificationUpdate } from '#shared/domain/notification'
import { NotificationStream } from '~/features/notifications/utils/notification-stream'
import { WorkspaceApi } from '~/core/http/workspace-api'
import { isAllowed } from '~~/server/features/auth/domain/access-policy'

test('all roles can read their inbox and acknowledge notifications without access to configuration writes', () => {
  for (const role of ['admin', 'editor', 'viewer'] as const) {
    assert.ok(isAllowed(role, 'notifications', 'GET'))
    assert.ok(isAllowed(role, 'notifications/stream', 'GET'))
    assert.ok(isAllowed(role, 'notifications/read', 'POST'))
    assert.equal(isAllowed(role, 'notifications', 'DELETE'), false)
    assert.equal(isAllowed(role, 'notifications/read', 'GET'), false)
  }
  assert.equal(isAllowed('viewer', 'data-sources', 'POST'), false)
  for (const cursor of ['-1', '1.2', 'not-a-cursor', '9223372036854775808', '9'.repeat(50)]) assert.equal(notificationCursor.safeParse(cursor).success, false)
  assert.ok(notificationCursor.safeParse('9223372036854775807').success)
  assert.equal(notificationReadSchema.safeParse({}).success, false)
})

test('authenticated SSE decodes chunked unicode frames and cancels cleanly on sign-out', async () => {
  const controller = new AbortController(), updates: NotificationUpdate[] = []
  const update: NotificationUpdate = { items: [], unread: 1, cursor: '4', events: [] }
  const text = 'event: heartbeat\r\ndata:\r\n\r\nevent: notifications\r\ndata: ' + JSON.stringify({ ...update, note: 'Strain ε' }) + '\r\n\r\n'
  const bytes = new TextEncoder().encode(text)
  const api = new WorkspaceApi(async <T>(_path: string, options?: { responseType?: string }) => {
    assert.equal(options?.responseType, 'stream')
    return new ReadableStream<Uint8Array>({ start(writer) {
      for (const byte of bytes) writer.enqueue(Uint8Array.of(byte))
      writer.close()
    } }) as T
  }, async () => {}, async () => {})
  const stream = new NotificationStream(api, (value) => {
    updates.push(value)
    controller.abort()
  })
  await stream.run(controller.signal)
  assert.equal(updates.length, 1)
  assert.equal(updates[0]?.cursor, '4')
})
