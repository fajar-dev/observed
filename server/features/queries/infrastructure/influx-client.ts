import { assertReadOnlyInfluxQl } from '../domain/read-only-influxql'
import { WorkspaceError } from '~~/server/domain/workspace-error'
import { parse } from 'csv-parse/sync'
import { fluxString } from '#shared/domain/query'
import type { Cell, QueryRequest, QueryResponse } from '#shared/domain/query'
import type { DataSourceInput } from '#shared/domain/data-source'
import { readRemote } from '~~/server/platform/http/remote-transport'
import { grafanaTimeMacros, interpolateVariables, queryWindow } from '#shared/utils/query-interpolation'

const rowLimit = 5000
type Row = Record<string, Cell>

function fluxRows(csv: string): Row[] {
  const records: string[][] = parse(csv, { relax_column_count: true, skip_empty_lines: true, bom: true })
  let columns: string[] = []
  let types: string[] = []
  let defaults: string[] = []
  let errorColumn = -1
  const rows: Row[] = []
  for (const record of records) {
    if (record[0] === '#datatype') {
      columns = []
      types = record
      defaults = []
      errorColumn = -1
    } else if (record[0] === '#default') {
      defaults = record
    } else if (record[0]?.startsWith('#')) {
      continue
    } else if (!columns.length || (record[1] === 'result' && record[2] === 'table') || (record[1] === 'error' && record[2] === 'reference')) {
      columns = record
      errorColumn = columns.indexOf('error')
    } else {
      if (errorColumn >= 0 && record[errorColumn] && columns.includes('reference')) {
        throw new WorkspaceError({ statusCode: 502, statusMessage: 'Flux execution error', data: { message: record[errorColumn]!.slice(0, 1500) } })
      }
      if (rows.length > rowLimit) continue
      rows.push(Object.fromEntries(columns.flatMap((column, index) => {
        if (!column || ['result', 'table', '_start', '_stop'].includes(column)) return []
        const raw = record[index] || defaults[index]
        let value: Cell = raw ?? null
        if (raw && ['double', 'long', 'unsignedLong'].includes(types[index] ?? '')) {
          const numeric = Number(raw)
          value = !Number.isFinite(numeric) ? null : types[index] === 'double' || Number.isSafeInteger(numeric) ? numeric : raw
        }
        if (raw && types[index] === 'boolean') value = raw === 'true'
        return [[column, value]]
      })))
    }
  }
  return rows
}

function influxqlRows(data: string): Row[] {
  const response = JSON.parse(data) as {
    error?: string
    results?: { error?: string, series?: { name: string, tags?: Record<string, string>, columns: string[], values: Cell[][] }[] }[]
  }
  const failure = response.error || response.results?.find(result => result.error)?.error
  if (failure) {
    throw new WorkspaceError({ statusCode: 502, statusMessage: 'InfluxQL execution error', data: { message: failure.slice(0, 1500) } })
  }
  const rows: Row[] = []
  for (const result of response.results ?? []) {
    for (const series of result.series ?? []) {
      for (const values of series.values) {
        rows.push({ _measurement: series.name, ...series.tags, ...Object.fromEntries(series.columns.map((column, index) => [column, values[index] ?? null])) })
        if (rows.length > rowLimit) return rows
      }
    }
  }
  return rows
}

export class InfluxClient {
  constructor(private readonly request = readRemote) {}

  async query(source: DataSourceInput, input: Omit<QueryRequest, 'dataSourceId'>): Promise<QueryResponse> {
    const started = Date.now()
    let window: ReturnType<typeof queryWindow>
    try {
      window = queryWindow(input, started)
    } catch (error) {
      throw new WorkspaceError({ statusCode: 422, statusMessage: error instanceof Error ? error.message : 'Invalid time range' })
    }
    const { start, stop, interval } = window
    let statement: string
    try {
      statement = grafanaTimeMacros(interpolateVariables(input.query, input.variables, source.queryLanguage), window)
    } catch (error) {
      throw new WorkspaceError({ statusCode: 422, statusMessage: error instanceof Error ? error.message : 'Invalid dashboard variable' })
    }
    const url = new URL(source.url)
    const headers: Record<string, string> = {}
    if (source.secret) {
      headers.Authorization = source.queryLanguage === 'influxql' && source.username
        ? `Basic ${Buffer.from(`${source.username}:${source.secret}`).toString('base64')}`
        : `Token ${source.secret}`
    }

    let rows: Row[]
    if (source.queryLanguage === 'flux') {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/api/v2/query`
      url.searchParams.set('org', source.organization)
      const prelude = `option v = {timeRangeStart: time(v: "${start}"), timeRangeStop: time(v: "${stop}"), windowPeriod: ${interval}, defaultBucket: ${fluxString(source.database)}}`
      // Flux imports must precede option declarations.
      const query = statement.replace(/^((?:(?:\s|\/\/[^\n]*\n)*import\s+(?:\w+\s+)?"[^"\n]+"[ \t]*\r?\n)*)/, (_match, imports: string) => imports + prelude + '\n')
      rows = fluxRows(await this.request(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Accept': 'application/csv' },
        body: JSON.stringify({ type: 'flux', query, dialect: { annotations: ['datatype', 'group', 'default'] } })
      }))
    } else {
      const query = statement
        .replace(/\$timeFilter|\$__timeFilter\(\)/g, `time >= '${start}' AND time <= '${stop}'`)
        .replace(/\$__interval\b/g, interval)
      assertReadOnlyInfluxQl(query)
      url.pathname = `${url.pathname.replace(/\/$/, '')}/query`
      url.searchParams.set('db', source.database)
      url.searchParams.set('q', query)
      rows = influxqlRows(await this.request(url, { headers }))
    }
    const truncated = rows.length > rowLimit
    rows = rows.slice(0, rowLimit)
    return { rows, columns: [...new Set(rows.flatMap(Object.keys))], duration: Date.now() - started, truncated, timeRange: { from: start, to: stop } }
  }
}
