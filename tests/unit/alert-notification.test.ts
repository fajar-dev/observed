import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatAlertNotification } from '~~/server/features/alerts/application/format-alert-notification'
import { TelegramHttpGateway } from '~~/server/features/telegram/infrastructure/telegram-http-gateway'

const rule = { name: 'CPU Proxmox pve > 80%', summary: 'Periksa workload VM/LXC.', severity: 'warning' as const, operator: 'gt' as const, threshold: 80 }
const time = '2026-11-20T01:42:00.000Z'

test('firing and recovery identify status, source, measured value, original threshold and event time', () => {
  const firing = formatAlertNotification(rule, { state: 'firing', value: 91.125, time }, 'Production InfluxDB')
  assert.equal(firing, [
    '🔴 <b>FIRING</b> · Observed',
    'Kondisi alert terpenuhi.', '',
    '<b>Alert:</b> CPU Proxmox pve &gt; 80%',
    '<b>Source:</b> Production InfluxDB',
    '<b>Nilai saat ini:</b> <code>91,125</code>',
    '<b>Threshold alert:</b> <code>&gt; 80</code>',
    '<b>Waktu kejadian:</b> 20 Nov 2026, 08:42:00 WIB',
    '<b>Severity:</b> WARNING', '',
    '<b>Keterangan:</b>', 'Periksa workload VM/LXC.'
  ].join('\n'))
  const recovered = formatAlertNotification(rule, { state: 'normal', value: 12.5, time }, 'Production InfluxDB')
  assert.ok(recovered.startsWith('🟢 <b>RECOVERED</b>'))
  assert.ok(recovered.includes('Kondisi sudah kembali normal.'))
  assert.ok(recovered.includes('<code>12,5</code>'))
  assert.ok(recovered.includes('<b>Threshold alert:</b> <code>&gt; 80</code>'))
})

test('all threshold operators remain readable and small nonzero values retain their magnitude', () => {
  for (const [operator, expected] of [['gt', '&gt;'], ['gte', '≥'], ['lt', '&lt;'], ['lte', '≤']] as const) {
    const text = formatAlertNotification({ ...rule, operator, threshold: 0.000001 }, { state: 'firing', value: 0.0000001, time }, 'Metrics')
    assert.ok(text.includes(`<code>${expected} 0,000001</code>`))
    assert.ok(text.includes('<code>0,0000001</code>'))
  }
})

test('user text cannot inject Telegram HTML or extra source/name fields', () => {
  const text = formatAlertNotification({ ...rule, name: '<b>CPU</b>\nSpoofed', summary: '<a href="tg://user?id=1">Mention</a> & notes' }, { state: 'normal', value: 0, time }, 'Source & <script>\nAnother source')
  assert.ok(text.includes('CPU&lt;/b&gt; Spoofed'))
  assert.ok(text.includes('Source &amp; &lt;script&gt; Another source'))
  assert.ok(text.includes('&lt;a href="tg://user?id=1"&gt;Mention&lt;/a&gt; &amp; notes'))
  assert.ok(!text.includes('<a '))
})

test('optional details are omitted and WIB dates stay correct across a UTC day boundary', () => {
  const text = formatAlertNotification({ name: 'CPU', operator: 'lt', threshold: 0 }, { state: 'normal', value: null, time: '2026-11-19T18:05:06Z' }, 'Metrics')
  assert.ok(text.includes('20 Nov 2026, 01:05:06 WIB'))
  assert.ok(text.includes('<code>—</code>'))
  assert.ok(!text.includes('Severity:'))
  assert.ok(!text.includes('Keterangan:'))
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
