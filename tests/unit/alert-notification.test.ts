import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatAlertNotification } from '~~/server/features/alerts/application/format-alert-notification'
import { formatTelegramTestNotification } from '~~/server/features/telegram/application/format-test-notification'
import { TelegramHttpGateway } from '~~/server/features/telegram/infrastructure/telegram-http-gateway'

const rule = { name: 'Bridge pier tilt > 0.5°', summary: 'Check the tilt sensor on the bridge pier.', severity: 'warning' as const, operator: 'gt' as const, threshold: 0.5 }
const time = '2026-11-20T01:42:00.000Z'

test('firing and recovery identify status, source, measured value, original threshold and event time', () => {
  const firing = formatAlertNotification(rule, { state: 'firing', value: 0.625, time }, 'Bridge sensors')
  assert.equal(firing, [
    '🔴 <b>FIRING</b> · Observed',
    'The measured value meets the alert condition.', '',
    '<b>Alert:</b> Bridge pier tilt &gt; 0.5°',
    '<b>Source:</b> Bridge sensors',
    '<b>Current value:</b> <code>0.625</code>',
    '<b>Threshold:</b> <code>&gt; 0.5</code>',
    '<b>Event time:</b> 20 Nov 2026, 08:42:00 UTC+07:00',
    '<b>Severity:</b> WARNING', '',
    '<b>Details:</b>', 'Check the tilt sensor on the bridge pier.'
  ].join('\n'))
  const recovered = formatAlertNotification(rule, { state: 'normal', value: 0.25, time }, 'Bridge sensors')
  assert.ok(recovered.startsWith('🟢 <b>RECOVERED</b>'))
  assert.ok(recovered.includes('The measured value no longer meets the alert condition.'))
  assert.ok(recovered.includes('<code>0.25</code>'))
  assert.ok(recovered.includes('<b>Threshold:</b> <code>&gt; 0.5</code>'))
  for (const message of [firing, recovered]) {
    assert.match(message, / · Observed\n/)
    assert.doesNotMatch(message, /\bworkspace\b|\bObserve\b|AMTI Observe/i)
  }
})

test('all threshold operators remain readable and small nonzero values retain their magnitude', () => {
  for (const [operator, expected] of [['gt', '&gt;'], ['gte', '≥'], ['lt', '&lt;'], ['lte', '≤']] as const) {
    const text = formatAlertNotification({ ...rule, operator, threshold: 0.000001 }, { state: 'firing', value: 0.0000001, time }, 'Sensor measurements')
    assert.ok(text.includes(`<code>${expected} 0.000001</code>`))
    assert.ok(text.includes('<code>0.0000001</code>'))
  }
})

test('user text cannot inject Telegram HTML or extra source/name fields', () => {
  const text = formatAlertNotification({ ...rule, name: '<b>Tilt</b>\nSpoofed', summary: '<a href="tg://user?id=1">Mention</a> & notes' }, { state: 'normal', value: 0, time }, 'Source & <script>\nAnother source')
  assert.ok(text.includes('Tilt&lt;/b&gt; Spoofed'))
  assert.ok(text.includes('Source &amp; &lt;script&gt; Another source'))
  assert.ok(text.includes('&lt;a href="tg://user?id=1"&gt;Mention&lt;/a&gt; &amp; notes'))
  assert.ok(!text.includes('<a '))
})

test('optional details are omitted and English dates stay correct across a UTC day boundary', () => {
  const text = formatAlertNotification({ name: 'Tilt', operator: 'lt', threshold: 0 }, { state: 'normal', value: null, time: '2026-08-19T18:05:06Z' }, 'Sensor measurements')
  assert.ok(text.includes('20 Aug 2026, 01:05:06 UTC+07:00'))
  assert.ok(text.includes('<code>—</code>'))
  assert.ok(!text.includes('Severity:'))
  assert.ok(!text.includes('Details:'))
})

test('Telegram transport requests HTML only when specified and surfaces rejected messages', async () => {
  const payloads: Record<string, unknown>[] = []
  const transport = new TelegramHttpGateway(async (_url, options) => {
    payloads.push(JSON.parse(String(options?.body)))
    return JSON.stringify({ ok: true })
  })
  await transport.send('test-token', '-100123', '<b>FIRING</b>', { parseMode: 'HTML' })
  await transport.send('test-token', '-100123', 'Connection test')
  assert.deepEqual(payloads[0], { chat_id: '-100123', text: '<b>FIRING</b>', parse_mode: 'HTML' })
  assert.equal(Object.hasOwn(payloads[1]!, 'parse_mode'), false)
  const rejected = new TelegramHttpGateway(async () => JSON.stringify({ ok: false }))
  await assert.rejects(rejected.send('test-token', '-100123', 'test'), /Telegram delivery failed/)
})

test('test messages identify Observed and structural sensor alerts without implying an actual event', () => {
  const text = formatTelegramTestNotification()
  assert.equal(text, 'Observed · Telegram connection test\n\nThis is a test message for structural sensor alerts.')
  assert.doesNotMatch(text, /\bworkspace\b|\bObserve\b|FIRING|RECOVERED/i)
})
