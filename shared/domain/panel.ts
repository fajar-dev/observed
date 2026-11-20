import { z } from 'zod'
import { name, queryText } from './common'
import { languages } from './data-source'

export const visualizations = ['line', 'area', 'bar', 'stat', 'gauge', 'bargauge', 'pie', 'table', 'text'] as const

export const fieldAppearanceSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  unit: z.string().max(80).optional(), decimals: z.number().int().min(0).max(8).optional(),
  displayName: z.string().max(500).optional(), width: z.number().min(30).max(3000).optional(),
  align: z.enum(['auto', 'left', 'center', 'right']).optional(),
  cellMode: z.enum(['auto', 'color-text', 'color-background', 'gauge']).optional(),
  hideLegend: z.boolean().optional(), hideTooltip: z.boolean().optional(), hideViz: z.boolean().optional(),
  min: z.number().finite().optional(), max: z.number().finite().optional()
})

export const panelOptionsSchema = z.object({
  unit: z.string().trim().max(80).default('none'),
  decimals: z.number().int().min(0).max(8).default(2),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#356f9f'),
  legend: z.boolean().default(true),
  legendPlacement: z.enum(['bottom', 'right']).optional(),
  legendMode: z.enum(['list', 'table']).optional(),
  legendCalculations: z.array(z.enum(['last', 'mean', 'min', 'max', 'sum', 'count'])).max(6).optional(),
  tooltipMode: z.enum(['single', 'multi']).optional(),
  legendWidth: z.number().min(100).max(600).optional(),
  colorMode: z.enum(['palette', 'fixed', 'thresholds']).optional(),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1).max(30).optional(),
  thresholdMode: z.enum(['absolute', 'percentage']).optional(),
  queryAliases: z.record(z.string().max(3), z.string().max(500)).optional(),
  fieldOptions: z.record(z.string().max(500), fieldAppearanceSchema).optional(),
  statGraphMode: z.enum(['area', 'none']).optional(),
  statColorMode: z.enum(['value', 'background', 'none']).optional(),
  statTextMode: z.enum(['auto', 'value', 'name', 'value_and_name', 'none']).optional(),
  tableShowHeader: z.boolean().optional(),
  tableCellHeight: z.enum(['sm', 'md', 'lg']).optional(),
  tableAlign: z.enum(['auto', 'left', 'center', 'right']).optional(),
  tableCellMode: z.enum(['auto', 'color-text', 'color-background', 'gauge']).optional(),
  lineInterpolation: z.enum(['linear', 'smooth', 'stepBefore', 'stepAfter']).optional(),
  stacking: z.enum(['none', 'normal']).optional(),
  axisLabel: z.string().max(120).optional(),
  rightAxisLabel: z.string().max(120).optional(),
  fill: z.number().min(0).max(100).default(15),
  lineWidth: z.number().min(0).max(6).default(2),
  reducer: z.enum(['last', 'mean', 'min', 'max', 'sum', 'count']).default('last'),
  thresholds: z.array(z.object({ value: z.number().finite(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(10).default([]),
  hiddenFields: z.array(z.string().max(200)).max(100).default([]),
  renameFields: z.record(z.string().max(200), z.string().max(200)).default({}),
  fieldOrder: z.array(z.string().max(200)).max(100).default([]),
  fieldUnits: z.record(z.string().max(200), z.string().max(40)).default({}),
  rightAxisFields: z.array(z.string().max(200)).max(50).default([]),
  displayName: z.string().max(500).optional(),
  text: z.string().max(10000).default('')
})

export const panelSchema = z.object({
  id: z.uuid(),
  title: name,
  type: z.enum(visualizations),
  span: z.number().int().min(1).max(24),
  dataSourceId: z.uuid().nullable(),
  dataSourceVariable: z.string().max(120).optional(),
  queryLanguage: z.enum(languages).optional(),
  query: z.string().max(25000),
  additionalQueries: z.array(queryText).max(9).default([]),
  note: z.string().max(1000).optional(),
  x: z.number().int().min(0).max(23).optional(),
  y: z.number().int().min(0).max(10000).optional(),
  height: z.number().int().min(2).max(100).optional(),
  sectionId: z.uuid().nullable().optional(),
  options: panelOptionsSchema.optional()
})

export type Panel = z.infer<typeof panelSchema>

export type PanelOptions = z.infer<typeof panelOptionsSchema>

export const visualizationCatalog = [
  { value: 'line', label: 'Time series', icon: 'i-lucide-chart-line', description: 'Trends over time' },
  { value: 'area', label: 'Area chart', icon: 'i-lucide-chart-area', description: 'Filled time series' },
  { value: 'bar', label: 'Bar chart', icon: 'i-lucide-chart-column', description: 'Compare values' },
  { value: 'stat', label: 'Metric', icon: 'i-lucide-hash', description: 'A value at a glance' },
  { value: 'gauge', label: 'Gauge', icon: 'i-lucide-gauge', description: 'Value within a range' },
  { value: 'bargauge', label: 'Bar gauge', icon: 'i-lucide-chart-bar', description: 'Compare values within a range' },
  { value: 'pie', label: 'Pie chart', icon: 'i-lucide-chart-pie', description: 'Parts of a whole' },
  { value: 'table', label: 'Table', icon: 'i-lucide-table-2', description: 'Inspect individual values' },
  { value: 'text', label: 'Text', icon: 'i-lucide-type', description: 'Notes and context' }
] as const

export function defaultPanelOptions(): PanelOptions {
  return panelOptionsSchema.parse({})
}
