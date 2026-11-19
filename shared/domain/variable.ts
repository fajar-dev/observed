import { variableName } from './common'
import { z } from 'zod'
import { querySchema, rangeSchema } from './query'
import type { QueryRequest } from './query'

export const variableSchema = z.object({
  name: variableName,
  label: z.string().max(80),
  values: z.array(z.string().min(1).max(500)).max(500),
  current: z.string().max(500),
  type: z.enum(['custom', 'constant', 'query', 'datasource', 'textbox', 'interval']).optional(),
  query: z.string().max(25000).optional(),
  dataSourceId: z.uuid().nullable().optional(),
  multi: z.boolean().optional(),
  includeAll: z.boolean().optional(),
  hidden: z.boolean().optional()
}).superRefine((variable, context) => {
  if (['custom', 'constant', 'interval'].includes(variable.type ?? 'custom') && !variable.values.length) {
    context.addIssue({ code: 'custom', path: ['values'], message: 'Enter at least one variable value.' })
  }
  if (variable.type === 'query' && !variable.query?.trim()) {
    context.addIssue({ code: 'custom', path: ['query'], message: 'Enter a query to load variable values.' })
  }
  if (variable.type === 'datasource' && variable.multi) {
    context.addIssue({ code: 'custom', path: ['multi'], message: 'Choose one data source per source variable.' })
  }
})

export type DashboardVariable = z.infer<typeof variableSchema>

export const variableResolutionSchema = z.object({
  variables: z.array(variableSchema).max(20),
  values: querySchema.shape.variables,
  dataSourceId: z.uuid().nullable(),
  range: rangeSchema,
  from: querySchema.shape.from,
  to: querySchema.shape.to
})

export type VariableValues = NonNullable<QueryRequest['variables']>

export type VariableResolutionInput = z.infer<typeof variableResolutionSchema>

export type VariableResolution = { selections: VariableValues, variables: DashboardVariable[], values: VariableValues, errors: Record<string, string> }
