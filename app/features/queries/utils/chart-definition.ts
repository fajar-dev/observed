import { areaY, barY, defineChart, group, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { chartCurves } from '@nuxt/ui/utils/chart'
import type { PanelOptions } from '#shared/domain/panel'
import type { QueryResponse } from '#shared/domain/query'
import type { TimeSeries } from './visualization'
import { fieldMetricOptions, formatMetric, seriesColor, timeSeriesBounds } from './visualization'

export interface ChartDatum { x: number, value: number, base: number, top: number, series: string, label: string, field?: string, secondary: boolean }
export const seriesKey = (series: TimeSeries) => series.id ?? series.label

function numericDomain(rows: ChartDatum[], settings: PanelOptions): [number, number] {
  let lower = Infinity, upper = -Infinity
  for (const row of rows) {
    lower = Math.min(lower, row.top, settings.stacking === 'normal' ? row.base : row.top)
    upper = Math.max(upper, row.top, settings.stacking === 'normal' ? row.base : row.top)
  }
  if (!Number.isFinite(lower)) return [settings.min ?? 0, settings.max ?? 1]
  const min = settings.min ?? (['percent', 'percentRatio'].includes(settings.unit) || settings.stacking === 'normal' ? Math.min(0, lower) : lower)
  const padding = (upper - min || Math.max(1, Math.abs(upper))) * 0.05
  return [min, Math.max(min + Number.EPSILON, settings.max ?? upper + padding)]
}

export function buildChartDefinition(series: TimeSeries[], type: 'line' | 'area' | 'bar', settings: PanelOptions, hasTime: boolean, timeRange: QueryResponse['timeRange'], dimensions: { width: number, height: number }, seriesColors?: string[]) {
  const totals = new Map<string, number>()
  const rows: ChartDatum[] = series.flatMap(item => item.points.map((point) => {
    const secondary = !!item.field && !!settings.rightAxisFields?.includes(item.field)
    const key = `${secondary}:${point.x}:${point.y < 0}`
    const base = settings.stacking === 'normal' ? totals.get(key) ?? 0 : 0
    const top = base + point.y
    totals.set(key, top)
    return { x: point.x, value: point.y, base, top, series: seriesKey(item), label: item.label, field: item.field, secondary }
  }))
  const primaryRows = rows.filter(row => !row.secondary), secondaryRows = rows.filter(row => row.secondary)
  const bounds = timeSeriesBounds(series, timeRange)
  const colors = scaleOrdinal<string, string>().domain(series.map(seriesKey)).range(series.map((item, index) => seriesColors?.[index] ?? seriesColor(item, index, settings)))
  const curve = settings.lineInterpolation === 'smooth' ? chartCurves.monotone : settings.lineInterpolation?.startsWith('step') ? chartCurves.step : undefined
  const marks = [false, true].flatMap((secondary) => {
    const data = secondary ? secondaryRows : primaryRows
    if (!data.length) return []
    const channels = { x: 'x' as const, y: 'top' as const, z: 'series' as const, color: 'series' as const, yScale: secondary ? 'secondary' as const : 'y' as const }
    if (type === 'bar') return [barY(data, { ...channels, ...(settings.stacking === 'normal' ? { y1: 'base' as const, y2: 'top' as const } : { layout: group({ padding: 0.1 }) }), inset: 0, radius: 2 })]
    const line = lineY(data, { ...channels, curve, strokeWidth: settings.lineWidth, points: data.length === 1 })
    return type === 'area' ? [decorative(areaY(data, { ...channels, y1: 'base', y2: 'top', curve, fillOpacity: settings.fill / 100 })), line] : [line]
  })
  const small = dimensions.height < 90
  const tickLabels = small ? false as const : { fontSize: 12, fontWeight: 500, thin: { minGap: 14, priority: 'ends' as const } }
  const secondaryField = series.find(item => item.field && settings.rightAxisFields?.includes(item.field))?.field
  const secondarySettings = fieldMetricOptions(secondaryField, { ...settings, min: undefined, max: undefined, unit: 'none' })
  return defineChart({
    marks,
    scales: {
      x: {
        scale: type === 'bar' ? scaleBand<number>().domain([...new Set(rows.map(row => row.x))].sort((a, b) => a - b)).padding(0.2) : scaleLinear().domain(bounds ? [bounds.min, bounds.max] : [0, 1]),
        nice: false,
        axis: small ? false : { tickLabels, ticks: { count: Math.max(2, Math.min(6, Math.floor(dimensions.width / 120))), format: (value: number) => hasTime ? new Date(value).toLocaleString(undefined, bounds && bounds.max - bounds.min >= 86400_000 ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' }) : String(value) } }
      },
      y: { scale: scaleLinear().domain(numericDomain(primaryRows, settings)), nice: settings.max === undefined, grid: true, axis: { tickLabels, label: small ? undefined : settings.axisLabel, ticks: { count: Math.max(2, Math.min(5, Math.floor(dimensions.height / 50))), format: (value: number) => formatMetric(value, settings) } } },
      secondary: { channel: 'y', side: 'right', scale: scaleLinear().domain(numericDomain(secondaryRows, secondarySettings)), nice: true, axis: secondaryRows.length && !small ? { tickLabels, label: settings.rightAxisLabel, ticks: { count: 4, format: (value: number) => formatMetric(value, secondarySettings) } } : false }
    },
    color: { scale: colors }, focus: settings.tooltipMode === 'multi' ? 'group-x' : 'nearest', maxFocusDistance: Infinity
  })
}
