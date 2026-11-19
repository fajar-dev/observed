import { z } from 'zod'
import { name } from './common'
import { rangeSchema } from './query'
import { panelSchema } from './panel'
import { variableSchema } from './variable'
import type { VariableResolution } from './variable'

export const dashboardSchema = z.object({
  name,
  description: z.string().max(1000),
  range: rangeSchema,
  refresh: z.number().int().min(0).max(3600).refine(value => value === 0 || value >= 15),
  panels: z.array(panelSchema).max(100),
  columns: z.union([z.literal(12), z.literal(24)]).optional(),
  sections: z.array(z.object({ id: z.uuid(), title: z.string().max(120), y: z.number().int().min(0).max(10000) })).max(100).optional(),
  folder: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  variables: z.array(variableSchema).max(20).refine(items => new Set(items.map(item => item.name)).size === items.length, 'Variable names must be unique').optional(),
  revision: z.number().int().min(1).optional(),
  importMetadata: z.object({
    sourceDocument: z.string().max(1500000),
    warnings: z.array(z.string().max(1000)).max(200)
  }).optional()
})

export type DashboardDefinition = z.infer<typeof dashboardSchema>

export type Dashboard = DashboardDefinition & { id: string, updatedAt: string }

export const folderSchema = z.object({ name })

export type Folder = { id: string, name: string }

export const importSchema = z.strictObject({
  document: z.unknown().refine(value => value !== undefined, 'Provide dashboard JSON.'),
  dataSourceId: z.uuid().nullable()
})

export type PanelDiagnostic = { id: string, title: string, status: 'ready' | 'empty' | 'error' | 'unconfigured', rows: number, message?: string }

export type DashboardDiagnostic = { variables: VariableResolution, panels: PanelDiagnostic[] }
