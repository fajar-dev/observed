import { z } from 'zod'
import { ranges } from './query'
import type { QueryRequest } from './query'

export const dashboardRefreshSchema = z.union([
  z.literal('auto'),
  z.number().int().min(0).max(86400).refine(value => value === 0 || value >= 5)
])
export type DashboardRefresh = z.infer<typeof dashboardRefreshSchema>

export const dashboardRefreshOptions: { label: string, value: DashboardRefresh }[] = [
  { label: 'Off', value: 0 },
  { label: 'Auto', value: 'auto' },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
  { label: '2h', value: 7200 },
  { label: '1d', value: 86400 }
]

/** Retain a saved custom interval without changing the standard choices for new dashboards. */
export function refreshOptionsFor(current: DashboardRefresh) {
  return dashboardRefreshOptions.some(option => option.value === current)
    ? dashboardRefreshOptions
    : [...dashboardRefreshOptions, { label: current + 's', value: current }]
}

/** Auto follows the chart's 300-point time window, bounded between five seconds and one day. */
export function dashboardRefreshSeconds(refresh: DashboardRefresh, time: Pick<QueryRequest, 'range' | 'from' | 'to'>): number {
  if (refresh !== 'auto') return refresh
  const start = Date.parse(time.from ?? ''), stop = Date.parse(time.to ?? '')
  const duration = Number.isFinite(start) && Number.isFinite(stop) && start < stop
    ? (stop - start) / 1000
    : ranges.find(range => range.value === time.range)!.seconds
  return Math.min(86400, Math.max(5, Math.ceil(duration / 300)))
}
