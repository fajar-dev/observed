import { defaultPanelOptions } from '#shared/domain/panel'
import type { PanelOptions } from '#shared/domain/panel'
import { grafanaColor, grafanaPalette, grafanaUnit } from '#shared/utils/import-appearance'

export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
export function string(value: unknown) {
  return typeof value === 'string' ? value : ''
}
export const grafanaCalculations: Record<string, PanelOptions['reducer']> = { lastNotNull: 'last', last: 'last', mean: 'mean', min: 'min', max: 'max', sum: 'sum', total: 'sum', count: 'count', current: 'last', avg: 'mean' }
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function grafanaAppearance(item: Record<string, unknown>, notes: string[]) {
  const options = defaultPanelOptions()
  options.fill = 0
  const fields = object(object(item.fieldConfig).defaults)
  const custom = object(fields.custom)
  const panel = object(item.options)
  const axisDefaults = Array.isArray(item.yaxes) ? item.yaxes.map(object) : []
  options.unit = grafanaUnit(fields.unit ?? axisDefaults[0]?.format ?? item.format)
  if (finite(fields.decimals ?? item.decimals)) options.decimals = clamp(Math.round(Number(fields.decimals ?? item.decimals)), 0, 8)
  if (finite(fields.min ?? axisDefaults[0]?.min)) options.min = Number(fields.min ?? axisDefaults[0]?.min)
  if (finite(fields.max ?? axisDefaults[0]?.max)) options.max = Number(fields.max ?? axisDefaults[0]?.max)
  options.palette = [...grafanaPalette]
  const color = object(fields.color)
  options.colorMode = color.mode === 'fixed' ? 'fixed' : color.mode === 'thresholds' ? 'thresholds' : 'palette'
  options.thresholdMode = object(fields.thresholds).mode === 'percentage' ? 'percentage' : 'absolute'
  const steps = object(fields.thresholds).steps
  if (Array.isArray(steps)) {
    options.thresholds = steps.map(object).flatMap((step) => {
      const color = grafanaColor(step.color)
      if (step.value === null && color) options.color = color
      return finite(step.value) && color ? [{ value: step.value, color }] : []
    }).slice(0, 10)
  }
  if (options.colorMode === 'fixed') options.color = grafanaColor(color.fixedColor) ?? options.color
  const legend = object(panel.legend ?? item.legend)
  options.legend = item.legend !== false && legend.showLegend !== false && legend.show !== false && legend.displayMode !== 'hidden'
  options.legendPlacement = legend.placement === 'right' || legend.rightSide === true ? 'right' : 'bottom'
  options.legendMode = legend.displayMode === 'table' || legend.alignAsTable === true ? 'table' : 'list'
  const calcs = Array.isArray(legend.calcs) ? legend.calcs.map(string) : ['current', 'min', 'max', 'avg', 'total'].filter(key => legend[key] === true)
  options.legendCalculations = [...new Set(calcs.flatMap(calc => grafanaCalculations[calc] ? [grafanaCalculations[calc]!] : []))]
  if (finite(legend.width)) options.legendWidth = clamp(legend.width, 100, 600)
  if (panel.tooltip && object(panel.tooltip).mode === 'multi') options.tooltipMode = 'multi'
  options.text = string(panel.content).slice(0, 10000)
  const calculation = string((Array.isArray(object(panel.reduceOptions).calcs) ? object(panel.reduceOptions).calcs as unknown[] : [])[0])
  if (grafanaCalculations[calculation]) options.reducer = grafanaCalculations[calculation]!
  if (finite(custom.fillOpacity ?? item.fill)) options.fill = clamp(Number(custom.fillOpacity ?? Number(item.fill) * 10), 0, 100)
  if (finite(custom.lineWidth ?? item.linewidth)) options.lineWidth = clamp(Number(custom.lineWidth ?? item.linewidth), 0, 6)
  if (string(fields.displayName)) options.displayName = string(fields.displayName)
  options.lineInterpolation = ['smooth', 'stepBefore', 'stepAfter'].includes(string(custom.lineInterpolation)) ? custom.lineInterpolation as NonNullable<PanelOptions['lineInterpolation']> : item.steppedLine === true ? 'stepAfter' : 'linear'
  options.stacking = object(custom.stacking).mode === 'normal' || item.stack === true ? 'normal' : 'none'
  if (object(custom.stacking).mode === 'percent') notes.push('Percentage stacking requires review; values use the original units.')
  options.axisLabel = string(custom.axisLabel ?? axisDefaults[0]?.label).slice(0, 120)
  options.rightAxisLabel = string(axisDefaults[1]?.label).slice(0, 120)
  if (['value', 'background', 'none'].includes(string(panel.colorMode))) options.statColorMode = panel.colorMode as NonNullable<PanelOptions['statColorMode']>
  if (['auto', 'value', 'name', 'value_and_name', 'none'].includes(string(panel.textMode))) options.statTextMode = panel.textMode as NonNullable<PanelOptions['statTextMode']>
  options.statGraphMode = panel.graphMode === 'area' ? 'area' : 'none'
  if (object(panel.footer).show === true) notes.push('Table footer calculations require review.')
  options.tableShowHeader = panel.showHeader !== false
  options.tableCellHeight = ['sm', 'md', 'lg'].includes(string(panel.cellHeight)) ? panel.cellHeight as NonNullable<PanelOptions['tableCellHeight']> : 'sm'
  options.tableAlign = ['left', 'center', 'right'].includes(string(custom.align)) ? custom.align as NonNullable<PanelOptions['tableAlign']> : 'auto'
  options.tableCellMode = cellMode(object(custom.cellOptions).type ?? custom.displayMode)
  options.fieldOptions = {}
  for (const [name, color] of Object.entries(object(item.aliasColors))) {
    const resolved = grafanaColor(color)
    if (resolved) options.fieldOptions[name] = { color: resolved }
  }
  for (const override of Array.isArray(object(item.fieldConfig).overrides) ? (object(item.fieldConfig).overrides as unknown[]).map(object) : []) {
    const matcher = object(override.matcher)
    if (matcher.id !== 'byName') {
      notes.push(`Field matcher "${string(matcher.id)}" requires review.`)
      continue
    }
    const name = string(matcher.options).slice(0, 500)
    const style = options.fieldOptions[name] ??= {}
    for (const property of Array.isArray(override.properties) ? override.properties.map(object) : []) {
      const value = property.value
      switch (property.id) {
        case 'unit': style.unit = options.fieldUnits[name] = grafanaUnit(value)
          break
        case 'decimals': if (finite(value)) style.decimals = clamp(Math.round(value), 0, 8)
          break
        case 'displayName': style.displayName = string(value).slice(0, 500)
          break
        case 'color': style.color = grafanaColor(object(value).fixedColor)
          break
        case 'min': if (finite(value)) style.min = value
          break
        case 'max': if (finite(value)) style.max = value
          break
        case 'custom.width': if (finite(value)) style.width = clamp(value, 30, 3000)
          break
        case 'custom.align': if (['auto', 'left', 'center', 'right'].includes(string(value))) style.align = value as NonNullable<typeof style.align>
          break
        case 'custom.cellOptions': style.cellMode = cellMode(object(value).type)
          break
        case 'custom.displayMode': style.cellMode = cellMode(value)
          break
        case 'custom.hidden': style.hideViz = value === true
          break
        case 'custom.hideFrom': style.hideLegend = object(value).legend === true
          style.hideTooltip = object(value).tooltip === true
          style.hideViz = object(value).viz === true
          break
        case 'custom.axisPlacement': if (value === 'right') options.rightAxisFields.push(name)
          break
        case 'custom.axisLabel': options.rightAxisLabel = string(value).slice(0, 120)
          break
      }
    }
  }
  return options
}
function cellMode(value: unknown): NonNullable<PanelOptions['tableCellMode']> {
  if (value === 'color-text') return 'color-text'
  if (value === 'color-background' || value === 'color-background-solid') return 'color-background'
  if (value === 'gauge' || value === 'gradient-gauge' || value === 'basic' || value === 'lcd-gauge') return 'gauge'
  return 'auto'
}
