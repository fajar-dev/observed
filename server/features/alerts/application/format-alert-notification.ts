import { product } from '#shared/config/product'
import type { AlertEvaluation, AlertRuleInput } from '#shared/domain/alert-rule'

const operators = { gt: '>', gte: '≥', lt: '<', lte: '≤' } as const
const numbers = new Intl.NumberFormat('id-ID', { maximumSignificantDigits: 6 })
const dates = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric'
})
const times = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
})

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function singleLine(value: string) {
  return escapeHtml(value.replace(/\s+/g, ' ').trim())
}

/** Telegram HTML, with user-provided content escaped and an explicit event timezone. */
export function formatAlertNotification(
  rule: Pick<AlertRuleInput, 'name' | 'summary' | 'severity' | 'operator' | 'threshold'>,
  evaluation: Pick<AlertEvaluation, 'state' | 'value' | 'time'>,
  sourceName: string
): string {
  const firing = evaluation.state === 'firing'
  const eventTime = new Date(evaluation.time)
  const value = evaluation.value === null ? '—' : numbers.format(evaluation.value)
  const threshold = `${operators[rule.operator]} ${numbers.format(rule.threshold)}`
  return [
    `${firing ? '🔴 <b>FIRING</b>' : '🟢 <b>RECOVERED</b>'} · ${product.name}`,
    firing ? 'Nilai pengukuran memenuhi kondisi alert.' : 'Nilai pengukuran tidak lagi memenuhi kondisi alert.',
    '',
    `<b>Alert:</b> ${singleLine(rule.name)}`,
    `<b>Source:</b> ${singleLine(sourceName)}`,
    `<b>Nilai saat ini:</b> <code>${escapeHtml(value)}</code>`,
    `<b>Threshold alert:</b> <code>${escapeHtml(threshold)}</code>`,
    `<b>Waktu kejadian:</b> ${dates.format(eventTime)}, ${times.format(eventTime)} WIB`,
    ...(rule.severity ? [`<b>Severity:</b> ${rule.severity.toUpperCase()}`] : []),
    ...(rule.summary?.trim() ? ['', '<b>Keterangan:</b>', escapeHtml(rule.summary.trim())] : [])
  ].join('\n')
}
