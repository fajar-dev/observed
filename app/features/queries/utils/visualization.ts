import type { Cell, QueryResponse } from '#shared/domain/query'
import type { PanelOptions } from '#shared/domain/panel'

export const chartPalette = ['#356f9f', '#1c9b85', '#cb8d37', '#8169b4', '#c46786', '#289aac', '#718bcc', '#65b599']
export interface TimeSeries { id?: string, label: string, field?: string, points: { x: number, y: number }[] }

export function transformResults(results: QueryResponse[], options: PanelOptions): QueryResponse[] {
  const hidden = new Set(options.hiddenFields)
  return results.map(result => ({
    ...result,
    columns: result.columns.filter(column => !hidden.has(column)).map(column => options.renameFields[column] || column).sort((a, b) => {
      const first = (options.fieldOrder ?? []).indexOf(a)
      const second = (options.fieldOrder ?? []).indexOf(b)
      return (first < 0 ? 1000 : first) - (second < 0 ? 1000 : second)
    }),
    rows: result.rows.map(row => Object.fromEntries(Object.entries(row)
      .filter(([key]) => !hidden.has(key))
      .map(([key, value]) => [options.renameFields[key] || key, value])))
  }))
}

export function toTimeSeries(results: QueryResponse[], displayName?: string, options?: PanelOptions): TimeSeries[] {
  const groups = new Map<string, TimeSeries>()
  results.forEach((result, queryIndex) => result.rows.forEach((row, index) => {
    const timestamp = row._time ?? row.time
    const x = typeof timestamp === 'string' ? Date.parse(timestamp) : index
    if (!Number.isFinite(x)) return
    const tags = Object.entries(row).filter(([key, value]) => typeof value === 'string' && !['_time', 'time', '_field', '_measurement'].includes(key))
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || ['_time', 'time'].includes(key)) continue
      const identity = [results.length > 1 ? String.fromCharCode(65 + queryIndex) : '', row._measurement, row._field ?? key, ...tags.map(([tag, value]) => `${tag}=${value}`)].filter(Boolean).join(' · ')
      const appearance = options ? fieldAppearance(String(row._field ?? key), options) : {}
      if (appearance.hideViz) continue
      const alias = options?.queryAliases?.[String(queryIndex)]?.replace(/\$tag_([A-Za-z_]\w*)|\[\[tag_([^\]]+)\]\]/g, (_match, first: string, second: string) => String(row[first || second] ?? '')).replaceAll('$measurement', String(row._measurement ?? '')).replaceAll('$col', String(row._field ?? key))
      const template = appearance.displayName || displayName || alias
      const label = template?.replace(/\$\{__field\.labels\.([^}]+)\}/g, (_match, name: string) => String(row[name] ?? '')).replaceAll('${__field.name}', String(row._field ?? key)) || identity
      if (!groups.has(identity) && groups.size < 24) groups.set(identity, { id: identity, label, field: String(row._field ?? key), points: [] })
      groups.get(identity)?.points.push({ x, y: value })
    }
  }))
  return [...groups.values()].map(series => ({ ...series, points: series.points.sort((a, b) => a.x - b.x) }))
}

export function reduceValues(series: TimeSeries, reducer: PanelOptions['reducer']) {
  const values = series.points.map(point => point.y)
  if (!values.length) return 0
  const reducers = {
    last: () => values.at(-1)!,
    mean: () => values.reduce((sum, value) => sum + value / values.length, 0),
    min: () => Math.min(...values),
    max: () => Math.max(...values),
    sum: () => values.reduce((sum, value) => sum + value, 0),
    count: () => values.length
  }
  return reducers[reducer]()
}

export function formatMetric(value: Cell | undefined, options: PanelOptions) {
  if (typeof value !== 'number') return value === null || value === undefined ? 'No value' : String(value)
  const fixed = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: options.decimals })
  if (options.unit.startsWith('suffix:')) return fixed(value) + ' ' + options.unit.slice(7)
  if (options.unit.startsWith('prefix:')) return options.unit.slice(7) + fixed(value)
  if (options.unit.startsWith('currency:')) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: options.unit.slice(9), maximumFractionDigits: options.decimals }).format(value)
    } catch {
      return fixed(value)
    }
  }
  if (['dateTimeAsIso', 'dateTimeAsUS', 'dateTimeAsSystem', 'dateTimeAsIsoNoDate'].includes(options.unit)) {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return fixed(value)
    return options.unit === 'dateTimeAsIso' ? date.toISOString() : options.unit === 'dateTimeAsIsoNoDate' ? date.toLocaleTimeString() : date.toLocaleString()
  }
  if (options.unit === 'short') {
    const scale = value === 0 ? 0 : Math.max(0, Math.min(4, Math.floor(Math.log10(Math.abs(value)) / 3)))
    return fixed(value / 1000 ** scale) + ['', ' K', ' M', ' B', ' T'][scale]
  }
  if (options.unit === 'dtdhms') {
    const seconds = Math.max(0, Math.floor(value))
    const days = Math.floor(seconds / 86400)
    return (days ? days + 'd ' : '') + Math.floor(seconds % 86400 / 3600) + 'h ' + Math.floor(seconds % 3600 / 60) + 'm'
  }
  if (options.unit === 'bits' || options.unit === 'bps') {
    const scale = value === 0 ? 0 : Math.max(0, Math.min(4, Math.floor(Math.log10(Math.abs(value)) / 3)))
    return fixed(value / 1000 ** scale) + ' ' + ['', 'k', 'M', 'G', 'T'][scale] + (options.unit === 'bps' ? 'bit/s' : 'bit')
  }
  if (['bytes', 'decimalBytes', 'bytesPerSecond', 'binBps'].includes(options.unit)) {
    const base = ['decimalBytes', 'bytesPerSecond'].includes(options.unit) ? 1000 : 1024
    const scale = value === 0 ? 0 : Math.min(4, Math.max(0, Math.floor(Math.log(Math.abs(value)) / Math.log(base))))
    return fixed(value / base ** scale) + ' ' + (base === 1000 ? ['B', 'kB', 'MB', 'GB', 'TB'] : ['B', 'KiB', 'MiB', 'GiB', 'TiB'])[scale] + (['bytesPerSecond', 'binBps'].includes(options.unit) ? '/s' : '')
  }
  if (options.unit === 'percentRatio') return fixed(value * 100) + '%'
  const suffixes: Record<string, string> = { none: '', string: '', percent: '%', gigabytes: ' GiB', seconds: ' s', milliseconds: ' ms', celsius: ' °C', fahrenheit: ' °F', kelvin: ' K', requests: ' req/s', hertz: ' Hz', kwatt: ' kW', watt: ' W', volt: ' V', amp: ' A', rpm: ' RPM', ns: ' ns', µs: ' µs', m: ' min', h: ' h', d: ' d', kbytes: ' KiB', mbytes: ' MiB', tbytes: ' TiB', decgbytes: ' GB', decmbytes: ' MB', deckbytes: ' kB', KBs: ' kB/s', MBs: ' MB/s', GBs: ' GB/s', Kbits: ' kbit/s', Mbits: ' Mbit/s', Gbits: ' Gbit/s', ops: ' ops/s', req: ' req', packets: ' packets' }
  const suffix = suffixes[options.unit] ?? (options.unit ? ' ' + options.unit : '')
  return fixed(value) + suffix
}

export function metricColor(value: number, options: PanelOptions) {
  if (options.colorMode === 'fixed') return options.color
  const comparable = options.thresholdMode === 'percentage' ? (value - (options.min ?? 0)) / ((options.max ?? 100) - (options.min ?? 0) || 1) * 100 : value
  const threshold = [...options.thresholds].sort((a, b) => a.value - b.value).filter(item => comparable >= item.value).at(-1)
  return threshold?.color ?? options.color
}

export function formatTableCell(key: string, value: unknown, options: PanelOptions) {
  if (typeof value === 'string' && /^(?:_time|time)$/i.test(key) && Number.isFinite(Date.parse(value))) return new Date(value).toLocaleString()
  if (typeof value !== 'number') return value === null || value === undefined ? '—' : String(value)
  return formatMetric(value, fieldMetricOptions(key, options))
}

// Exact endpoints avoid the extra, empty time blocks produced by a rounded linear axis.
export function timeSeriesBounds(series: TimeSeries[], timeRange?: QueryResponse['timeRange']) {
  const from = timeRange ? Date.parse(timeRange.from) : NaN
  const to = timeRange ? Date.parse(timeRange.to) : NaN
  if (Number.isFinite(from) && Number.isFinite(to) && from < to) return { min: from, max: to }
  let min = Infinity
  let max = -Infinity
  for (const item of series) for (const point of item.points) {
    min = Math.min(min, point.x)
    max = Math.max(max, point.x)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined
  return min === max ? { min: min - 1000, max: max + 1000 } : { min, max }
}

export function fieldAppearance(field: string | undefined, options: PanelOptions) {
  const name = field ?? ''
  const original = Object.entries(options.renameFields).find(([, renamed]) => renamed === name)?.[0]
  return options.fieldOptions?.[name] ?? (original ? options.fieldOptions?.[original] : undefined) ?? {}
}
export function fieldMetricOptions(field: string | undefined, options: PanelOptions): PanelOptions {
  const appearance = fieldAppearance(field, options)
  return { ...options, ...appearance, colorMode: appearance.color ? 'fixed' : options.colorMode, unit: appearance.unit ?? (field ? options.fieldUnits?.[field] : undefined) ?? options.unit }
}
export function seriesColor(item: TimeSeries, index: number, options: PanelOptions) {
  const override = fieldAppearance(item.field, options).color ?? options.fieldOptions?.[item.label]?.color
  if (override) return override
  if (options.colorMode === 'fixed') return options.color
  if (options.colorMode === 'thresholds') return metricColor(reduceValues(item, options.reducer), options)
  const palette = options.palette ?? chartPalette
  return options.palette ? palette[index % palette.length]! : index === 0 ? options.color : palette[index % palette.length]!
}
