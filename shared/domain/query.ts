import { z } from 'zod'
import type { DataSource } from './data-source'
import { queryText, variableName } from './common'

export const ranges = [
  { label: 'Last 5 minutes', value: '5m', seconds: 300 },
  { label: 'Last 15 minutes', value: '15m', seconds: 900 },
  { label: 'Last 30 minutes', value: '30m', seconds: 1800 },
  { label: 'Last hour', value: '1h', seconds: 3600 },
  { label: 'Last 6 hours', value: '6h', seconds: 21600 },
  { label: 'Last 24 hours', value: '24h', seconds: 86400 },
  { label: 'Last 7 days', value: '7d', seconds: 604800 },
  { label: 'Last 30 days', value: '30d', seconds: 2592000 }
] as const

export const rangeSchema = z.enum(['5m', '15m', '30m', '1h', '6h', '24h', '7d', '30d'])

export const querySchema = z.object({
  dataSourceId: z.uuid(),
  query: queryText,
  range: rangeSchema,
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  variables: z.record(variableName, z.union([z.string().max(500), z.array(z.string().max(500)).max(500)])).optional()
})

export type QueryRequest = z.infer<typeof querySchema>

export type Cell = string | number | boolean | null

export interface QueryResponse {
  columns: string[]
  rows: Record<string, Cell>[]
  duration: number
  truncated: boolean
  timeRange?: { from: string, to: string }
}

export function starterQuery(source: DataSource) {
  return source.queryLanguage === 'flux'
    ? 'from(bucket: v.defaultBucket)\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> limit(n: 500)'
    : 'SHOW MEASUREMENTS LIMIT 100'
}

export function fluxString(value: string) {
  return JSON.stringify(value).replaceAll('$' + '{', '\\' + '$' + '{')
}
