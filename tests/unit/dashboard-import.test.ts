import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createError } from 'h3'
import { DashboardJsonImporter } from '~~/server/features/dashboards/infrastructure/dashboard-json-importer'
import { VariableResolver } from '~~/server/features/queries/application/variable-resolver'
import { DashboardDiagnostics } from '~~/server/features/dashboards/application/dashboard-diagnostics'
import { defaultPanelOptions } from '#shared/domain/panel'
import { dataSourceSchema } from '#shared/domain/data-source'
import type { DashboardVariable } from '#shared/domain/variable'
import type { QueryRequest, QueryResponse } from '#shared/domain/query'
import type { DataSource } from '#shared/domain/data-source'
import { grafanaTimeMacros, interpolateVariables, queryWindow } from '#shared/utils/query-interpolation'
import { allVariableValue, expandVariableValues } from '#shared/utils/dashboard-variables'
import { formatMetric, formatTableCell } from '~~/app/features/queries/utils/visualization'

Object.assign(globalThis, { createError })

const source: DataSource = {
  id: '8ba7a537-c2cb-45c4-aeb6-07dc49d5bd1b', name: 'Metrics', queryLanguage: 'flux',
  url: 'http://localhost:8086', database: 'metrics', organization: 'workspace', hasSecret: true
}
const result = (rows: QueryResponse['rows']): QueryResponse => ({
  columns: [...new Set(rows.flatMap(Object.keys))], rows, duration: 1, truncated: false
})
const panelId = 'f5db69dc-3d21-42f0-8f75-5c665cf38e19'
const query = 'from(bucket: "${Bucket}") |> range(start: v.timeRangeStart, stop: v.timeRangeStop) |> filter(fn: (r) => r.host =~ /^${server:regex}$/)'

describe('Grafana compatibility', () => {
  test('preserves odd-width 24-column panels and removes empty row gaps', () => {
    const document = {
      title: 'Imported dashboard',
      templating: { list: [
        { name: 'source', type: 'datasource', query: 'influxdb' },
        { name: 'Bucket', type: 'query', query: 'buckets()' },
        { name: 'server', type: 'query', query: 'from(bucket: "${Bucket}") |> distinct(column: "host")', multi: true, includeAll: true }
      ] },
      panels: [
        { title: 'Summary', type: 'row', gridPos: { x: 0, y: 0, w: 24, h: 1 } },
        { title: 'CPU', type: 'stat', gridPos: { x: 0, y: 1, w: 3, h: 6 }, targets: [{ query }], fieldConfig: { defaults: { unit: 'percentunit' } } },
        { title: 'Cores', type: 'stat', gridPos: { x: 3, y: 1, w: 3, h: 3 }, targets: [{ query }] },
        { title: 'Traffic', type: 'timeseries', gridPos: { x: 0, y: 71, w: 12, h: 8 }, targets: [{ query }] }
      ]
    }
    const imported = new DashboardJsonImporter().convert(document, source)
    assert.equal(imported.dashboard.columns, 24)
    assert.deepEqual(imported.dashboard.panels.map(panel => [panel.x, panel.y, panel.span, panel.height]), [[0, 1, 3, 6], [3, 1, 3, 3], [0, 7, 12, 8]])
    assert.equal(imported.dashboard.variables?.find(variable => variable.name === 'server')?.type, 'query')
    assert.equal(imported.dashboard.variables?.find(variable => variable.name === 'server')?.multi, true)
    assert.equal(imported.dashboard.panels[0]?.options?.unit, 'percentRatio')
    assert.equal(imported.dashboard.panels[0]?.dataSourceId, source.id)
    assert.equal(imported.dashboard.panels[0]?.dataSourceVariable, 'source')
    assert.equal(JSON.parse(imported.dashboard.importMetadata!.sourceDocument).title, document.title)
  })

  test('interpolates quoted values, regex values, and multi-value equality safely', () => {
    const statement = interpolateVariables(query, { Bucket: 'metrics', server: ['pve.01', 'pve/02'] }, 'flux')
    assert.match(statement, /from\(bucket: "metrics"\)/)
    assert.ok(statement.includes('/^(pve\\.01|pve\\/02)$/'))
    const equality = interpolateVariables('r["host"] == "${host}"', { host: ['one', 'two'] }, 'flux')
    assert.equal(equality, 'contains(value: r["host"], set: ["one", "two"])')
    const literal = interpolateVariables('r.host == "${host}"', { host: 'a" or true // ' }, 'flux')
    assert.equal(literal, 'r.host == "a\\" or true // "')
    assert.throws(() => interpolateVariables(query, {}, 'flux'), /not resolved/)
    assert.throws(() => interpolateVariables(query, { Bucket: 'metrics', server: [] }, 'flux'), /at least one value/)
  })

  test('expands All to the discovered values', () => {
    const variable: DashboardVariable = { name: 'server', label: 'Server', values: ['one', 'two'], current: 'one', multi: true, includeAll: true }
    assert.deepEqual(expandVariableValues([variable], { server: [allVariableValue] }), { server: ['one', 'two'] })
  })

  test('resolves query dependencies regardless of definition order', async () => {
    const calls: QueryRequest[] = []
    const resolver = new VariableResolver(async (input) => {
      calls.push(input)
      if (input.query === 'buckets()') return result([{ name: '_monitoring' }, { name: 'metrics' }])
      assert.equal(input.variables?.Bucket, 'metrics')
      return result([{ host: 'pve' }])
    }, async () => [source])
    const variables: DashboardVariable[] = [
      { name: 'server', label: 'Server', values: [], current: '', type: 'query', query: 'from(bucket: "${Bucket}") |> distinct(column: "host")', multi: true },
      { name: 'Bucket', label: 'Bucket', values: [], current: '', type: 'query', query: 'buckets()' },
      { name: 'datasource', label: 'Data source', values: [], current: '', type: 'datasource' }
    ]
    const resolved = await resolver.resolve({ dataSourceId: source.id, variables, range: '1h' })
    assert.deepEqual(resolved.errors, {})
    assert.equal(resolved.values.Bucket, 'metrics')
    assert.deepEqual(resolved.values.server, ['pve'])
    assert.equal(calls.length, 2)
    assert.equal(calls[0]?.query, 'buckets()')
  })

  test('reports circular variable definitions and empty variable queries', async () => {
    const resolver = new VariableResolver(async () => result([]), async () => [source])
    const cyclic = await resolver.resolve({ dataSourceId: source.id, range: '1h', variables: [
      { name: 'a', label: '', values: [], current: '', type: 'query', query: 'from(bucket: "$b")' },
      { name: 'b', label: '', values: [], current: '', type: 'query', query: 'from(bucket: "$a")' }
    ] })
    assert.ok(Object.values(cyclic.errors).some(message => message.includes('Circular')))
    const empty = await resolver.resolve({ dataSourceId: source.id, range: '1h', variables: [
      { name: 'host', label: '', values: [], current: '', type: 'query', query: 'missing_values()' }
    ] })
    assert.match(empty.errors.host!, /no values/)
  })

  test('distinguishes missing mappings, query failures, empty results, and live data', async () => {
    const diagnostics = new DashboardDiagnostics(async (input) => {
      if (input.query === 'broken') throw createError({ statusCode: 502, data: { message: 'Unknown measurement' } })
      return input.query === 'empty' ? result([]) : result([{ _value: 2 }])
    }, async () => ({ variables: [], values: {}, selections: {}, errors: {} }))
    const base = { title: 'Panel', type: 'line' as const, span: 6, dataSourceId: source.id, additionalQueries: [] }
    const checked = await diagnostics.check({
      name: 'Health', description: '', range: '1h', refresh: 0,
      panels: [
        { ...base, id: panelId, dataSourceId: null, query: 'live' },
        { ...base, id: panelId, query: 'broken' },
        { ...base, id: panelId, query: 'empty' },
        { ...base, id: panelId, query: 'live' }
      ]
    })
    assert.deepEqual(checked.panels.map(panel => panel.status), ['unconfigured', 'error', 'empty', 'ready'])
    assert.equal(checked.panels[1]?.message, 'Unknown measurement')
  })

  test('formats percent ratios and Grafana uptime fields correctly', () => {
    const options = defaultPanelOptions()
    assert.equal(formatMetric(0.125, { ...options, unit: 'percentRatio' }), '12.5%')
    assert.equal(formatMetric(1024 ** 3, { ...options, unit: 'bytes' }), '1 GiB')
    assert.equal(formatTableCell('Uptime', 90060, { ...options, fieldUnits: { Uptime: 'dtdhms' } }), '1d 1h 1m')
  })

  test('expands Grafana time macros and validates partial forms without throwing', () => {
    const window = queryWindow({ range: '1h', from: '2026-11-19T00:00:00Z', to: '2026-11-19T01:00:00Z' })
    assert.equal(grafanaTimeMacros('${__interval} $__interval_ms ${__from:date:iso}', window), '12s 12000 2026-11-19T00:00:00.000Z')
    assert.throws(() => queryWindow({ range: '1h', from: '2026-11-19T00:00:00Z' }))
    for (const url of ['', 'h', 'http:', 'http://']) assert.equal(dataSourceSchema.safeParse({ ...source, url }).success, false)
  })
})

test('time axes use the requested window without rounding into empty hours', async () => {
  const { timeSeriesBounds } = await import('~~/app/features/queries/utils/visualization')
  const from = '2026-11-19T03:43:00Z'
  const to = '2026-11-19T09:43:00Z'
  const series = [{ label: 'CPU', points: [{ x: Date.parse(from) + 60000, y: 1 }, { x: Date.parse(to) - 60000, y: 2 }] }]
  assert.deepEqual(timeSeriesBounds(series, { from, to }), { min: Date.parse(from), max: Date.parse(to) })
  assert.deepEqual(timeSeriesBounds(series), { min: series[0]!.points[0]!.x, max: series[0]!.points[1]!.x })
  assert.equal(timeSeriesBounds([]), undefined)
  const one = timeSeriesBounds([{ label: 'one', points: [{ x: Date.parse(from), y: 10 }] }])!
  assert.ok(one.min < Date.parse(from) && one.max > Date.parse(from))
})

test('Grafana appearance retains sections, tall panels, classic palette, legend values and field overrides', async () => {
  const { grafanaPalette } = await import('#shared/utils/import-appearance')
  const document = {
    title: 'Original appearance', panels: [
      { type: 'row', title: 'Summary $server', gridPos: { x: 0, y: 0, w: 24, h: 1 } },
      { type: 'timeseries', title: 'CPU', gridPos: { x: 0, y: 1, w: 13, h: 30 }, targets: [{ query: 'from(bucket: "metrics")' }],
        options: { legend: { displayMode: 'table', placement: 'right', calcs: ['lastNotNull', 'mean', 'max'], width: 280 }, tooltip: { mode: 'multi' } },
        fieldConfig: { defaults: { unit: 'percentunit', color: { mode: 'palette-classic' }, custom: { fillOpacity: 25, lineInterpolation: 'smooth' } }, overrides: [{ matcher: { id: 'byName', options: 'load' }, properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: 'light-blue' } }, { id: 'unit', value: 'short' }, { id: 'custom.axisPlacement', value: 'right' }] }] } }
    ]
  }
  const imported = new DashboardJsonImporter().convert(document, source)
  const panel = imported.dashboard.panels[0]!
  assert.equal(panel.height, 30)
  assert.equal(panel.span, 13)
  assert.equal(panel.y, 1)
  assert.equal(panel.type, 'area')
  assert.equal(imported.dashboard.sections?.[0]?.title, 'Summary $server')
  assert.deepEqual(panel.options?.palette, grafanaPalette)
  assert.equal(panel.options?.legendPlacement, 'right')
  assert.equal(panel.options?.legendMode, 'table')
  assert.deepEqual(panel.options?.legendCalculations, ['last', 'mean', 'max'])
  assert.equal(panel.options?.legendWidth, 280)
  assert.equal(panel.options?.fieldOptions?.load?.color, '#8ab8ff')
  assert.equal(panel.options?.fieldOptions?.load?.unit, 'short')
  assert.equal(panel.options?.unit, 'percentRatio')
  assert.equal(panel.options?.tooltipMode, 'multi')
})

test('Grafana neutral cards, fixed colors and percentage thresholds preserve their meaning', async () => {
  const { grafanaAppearance } = await import('~~/server/features/dashboards/infrastructure/grafana-appearance')
  const { metricColor } = await import('~~/app/features/queries/utils/visualization')
  const neutral = grafanaAppearance({ options: { colorMode: 'none', graphMode: 'area' }, fieldConfig: { defaults: { color: { mode: 'thresholds' }, thresholds: { mode: 'percentage', steps: [{ color: 'green', value: null }, { color: 'red', value: 80 }] }, min: 100, max: 200 } } }, [])
  assert.equal(neutral.statColorMode, 'none')
  assert.equal(neutral.statGraphMode, 'area')
  assert.equal(metricColor(175, neutral), '#73bf69')
  assert.equal(metricColor(185, neutral), '#f2495c')
  const fixed = grafanaAppearance({ fieldConfig: { defaults: { color: { mode: 'fixed', fixedColor: '#abc' } } } }, [])
  assert.equal(metricColor(999, fixed), '#aabbcc')
})

test('Grafana table formatting survives organize renames and keeps column appearance', async () => {
  const { fieldAppearance, formatTableCell, transformResults } = await import('~~/app/features/queries/utils/visualization')
  const imported = new DashboardJsonImporter().convert({ title: 'Table', panels: [{ type: 'table', title: 'Storage', options: { showHeader: false, cellHeight: 'lg' },
    targets: [{ query: 'from(bucket: "metrics")' }], fieldConfig: { defaults: { unit: 'none' }, overrides: [{ matcher: { id: 'byName', options: 'capacity' }, properties: [{ id: 'unit', value: 'bytes' }, { id: 'custom.width', value: 240 }, { id: 'custom.align', value: 'right' }, { id: 'custom.cellOptions', value: { type: 'color-background' } }] }] },
    transformations: [{ id: 'organize', options: { renameByName: { capacity: 'Capacity' }, excludeByName: { internal: true }, indexByName: { capacity: 0, host: 1 } } }]
  }] }, source)
  const options = imported.dashboard.panels[0]!.options!
  const transformed = transformResults([{ rows: [{ host: 'server', capacity: 1073741824, internal: 'hidden' }], columns: ['host', 'capacity', 'internal'], duration: 0, truncated: false }], options)
  assert.deepEqual(transformed[0]!.columns, ['Capacity', 'host'])
  assert.equal(formatTableCell('Capacity', 1073741824, options), '1 GiB')
  assert.equal(fieldAppearance('Capacity', options).width, 240)
  assert.equal(fieldAppearance('Capacity', options).align, 'right')
  assert.equal(fieldAppearance('Capacity', options).cellMode, 'color-background')
  assert.equal(options.tableShowHeader, false)
  assert.equal(options.tableCellHeight, 'lg')
})

test('Grafana query aliases and field color overrides remain consistent with the legend', async () => {
  const { seriesColor, toTimeSeries } = await import('~~/app/features/queries/utils/visualization')
  const options = { ...defaultPanelOptions(), colorMode: 'palette' as const, queryAliases: { 0: '$measurement · $tag_host · $col' }, fieldOptions: { cpu: { color: '#ff9830' } } }
  const series = toTimeSeries([result([{ _time: '2026-11-19T01:00:00Z', _measurement: 'nodes', _field: 'cpu', host: 'pve', _value: 0.5 }])], undefined, options)
  assert.equal(series[0]?.label, 'nodes · pve · cpu')
  assert.equal(seriesColor(series[0]!, 0, options), '#ff9830')
})

test('InfluxQL legacy timeFilter remains a macro while dashboard variables are resolved', async () => {
  const { InfluxClient } = await import('~~/server/features/queries/infrastructure/influx-client')
  let statement = ''
  const client = new InfluxClient(async (url) => {
    statement = url.searchParams.get('q') ?? ''
    return JSON.stringify({ results: [{ series: [{ name: 'telemetry', columns: ['time', 'mean'], values: [['2026-11-19T01:00:00Z', 42]] }] }] })
  })
  const result = await client.query({ name: 'SQL', queryLanguage: 'influxql', url: 'http://localhost:8086', database: 'metrics', organization: '' }, {
    query: 'SELECT mean("cpu") FROM "telemetry" WHERE $timeFilter AND "host" = $host GROUP BY time(${__interval})',
    range: '1h', from: '2026-11-19T00:00:00Z', to: '2026-11-19T01:00:00Z', variables: { host: 'pve-one' }
  })
  assert.match(statement, /time >= '2026-11-19T00:00:00.000Z'/)
  assert.match(statement, /time <= '2026-11-19T01:00:00.000Z'/)
  assert.match(statement, /"host" = 'pve-one'/)
  assert.match(statement, /GROUP BY time\(12s\)/)
  assert.ok(!statement.includes('$'))
  assert.equal(result.rows[0]?.mean, 42)
})

test('dashboard import accepts JSON and rejects the removed remote-ID contract', async () => {
  const { importSchema } = await import('#shared/domain/dashboard')
  assert.equal(importSchema.safeParse({ dataSourceId: null, document: { title: 'JSON dashboard', panels: [] } }).success, true)
  assert.equal(importSchema.safeParse({ dataSourceId: null }).success, false)
  assert.equal(importSchema.safeParse({ dataSourceId: null, grafanaId: '15356' }).success, false)
  assert.equal(importSchema.safeParse({ dataSourceId: null, grafanaId: '15356', document: { title: 'JSON dashboard', panels: [] } }).success, false)
})
