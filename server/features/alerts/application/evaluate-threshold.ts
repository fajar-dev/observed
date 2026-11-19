import type { AlertEvaluation, AlertRuleInput } from '#shared/domain/alert-rule'
import type { QueryResponse } from '#shared/domain/query'

function timestamp(value: unknown): [milliseconds: number, remainingNanoseconds: number] {
  if (typeof value !== 'string') return [-Infinity, 0]
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) return [-Infinity, 0]
  const fraction = value.match(/\.(\d{1,9})(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? ''
  return [milliseconds, Number(fraction.padEnd(9, '0').slice(3))]
}

export function evaluateThreshold(rule: Pick<AlertRuleInput, 'field' | 'reducer' | 'operator' | 'threshold'>, result: QueryResponse, time: string): AlertEvaluation {
  if (result.truncated) {
    return { time, value: null, state: 'error', message: 'Query exceeded 5,000 rows. Aggregate or narrow the query.' }
  }

  let count = 0
  let minimum = Infinity
  let maximum = -Infinity
  let mean = 0
  let latest = 0
  let latestTime = -Infinity
  let latestNanoseconds = 0
  for (const row of result.rows) {
    const [sampleTime, nanoseconds] = timestamp(row._time ?? row.time)
    const fields = rule.field ? [rule.field] : typeof row._value === 'number' ? ['_value'] : Object.keys(row)
    for (const field of fields) {
      const sample = row[field]
      if (typeof sample !== 'number' || !Number.isFinite(sample) || field === 'time' || field === '_time') continue
      count++
      minimum = Math.min(minimum, sample)
      maximum = Math.max(maximum, sample)
      mean = mean * ((count - 1) / count) + sample / count
      if (sampleTime > latestTime || (sampleTime === latestTime && nanoseconds >= latestNanoseconds)) {
        latestTime = sampleTime
        latestNanoseconds = nanoseconds
        latest = sample
      }
    }
  }

  if (!count) return { time, value: null, state: 'no_data' }
  const value = { last: latest, mean, min: minimum, max: maximum }[rule.reducer]
  const firing = {
    gt: value > rule.threshold, lt: value < rule.threshold,
    gte: value >= rule.threshold, lte: value <= rule.threshold
  }[rule.operator]
  return { time, value, state: firing ? 'firing' : 'normal' }
}
