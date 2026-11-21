import { product } from '#shared/config/product'
import type { AlertEvaluation, AlertRuleInput } from '#shared/domain/alert-rule'

const operators = { gt: '>', gte: '≥', lt: '<', lte: '≤' } as const
const numbers = new Intl.NumberFormat('en', { maximumSignificantDigits: 6 })
const dates = new Intl.DateTimeFormat('en-GB', {
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
    firing ? 'The measured value meets the alert condition.' : 'The measured value no longer meets the alert condition.',
    '',
    `<b>Alert:</b> ${singleLine(rule.name)}`,
    `<b>Source:</b> ${singleLine(sourceName)}`,
    `<b>Current value:</b> <code>${escapeHtml(value)}</code>`,
    `<b>Threshold:</b> <code>${escapeHtml(threshold)}</code>`,
    `<b>Event time:</b> ${dates.format(eventTime)}, ${times.format(eventTime)} UTC+07:00`,
    ...(rule.severity ? [`<b>Severity:</b> ${rule.severity.toUpperCase()}`] : []),
    ...(rule.summary?.trim() ? ['', '<b>Details:</b>', escapeHtml(rule.summary.trim())] : [])
  ].join('\n')
}
