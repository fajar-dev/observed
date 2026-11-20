import { z } from 'zod'
import { name } from './common'
import { querySchema } from './query'
import type { QueryResponse } from './query'

export const alertRuleSchema = querySchema.extend({
  name,
  summary: z.string().max(1000).optional(),
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  folder: z.string().max(120).optional(),
  pendingFor: z.number().int().min(0).max(86400).optional(),
  muteUntil: z.iso.datetime().nullable().optional(),
  enabled: z.boolean(),
  telegramDestinationIds: z.array(z.uuid()).max(20).default([]).refine(ids => new Set(ids).size === ids.length),
  operator: z.enum(['gt', 'lt', 'gte', 'lte']),
  reducer: z.enum(['last', 'mean', 'min', 'max']),
  field: z.string().trim().max(200).default(''),

  threshold: z.number().finite(),
  interval: z.number().int().min(30).max(86400)
})

export const alertPreviewSchema = alertRuleSchema.omit({ name: true, enabled: true, telegramDestinationIds: true })

export type AlertRuleInput = z.infer<typeof alertRuleSchema>

export type AlertState = 'pending' | 'normal' | 'firing' | 'no_data' | 'error'

export type AlertEvaluation = { state: AlertState, value: number | null, time: string, message?: string, deliveryError?: string }

export type AlertRulePreview = AlertEvaluation & { queryResult: QueryResponse }

export type AlertRule = AlertRuleInput & { id: string, evaluation?: AlertEvaluation, notifiedDestinations?: string[], notificationFiring?: boolean, pendingSince?: string | null, evaluationHistory?: AlertEvaluation[] }
