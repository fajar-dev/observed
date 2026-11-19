import { WorkspaceError } from '../../core/workspace-error'
import type { AlertEvaluation, AlertRuleInput, AlertRule, AlertRulePreview } from '#shared/domain/alert-rule'

import type { WorkspaceStore, DataSourceAccess, TelegramAccess, Clock } from '../../core/ports'
import { evaluateThreshold } from './evaluate-threshold'

export class AlertService {
  constructor(private readonly store: WorkspaceStore, private readonly dataSources: DataSourceAccess, private readonly telegram: TelegramAccess, private readonly clock: Clock) {}

  async saveAlert(input: AlertRuleInput, id?: string) {
    await this.dataSources.validateSources([input.dataSourceId])
    const destinations = new Set((await this.telegram.list()).map(destination => destination.id))
    if (input.telegramDestinationIds.some(id => !destinations.has(id))) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Select existing Telegram destinations' })
    if (!id) return this.store.create('alertRules', input)
    const result = await this.store.withLock(id, async () => {
      const previous = await this.store.get<AlertRule>('alertRules', id)
      const changed = ['query', 'dataSourceId', 'range', 'field', 'reducer', 'operator', 'threshold', 'pendingFor']
        .some(key => previous[key as keyof AlertRuleInput] !== input[key as keyof AlertRuleInput])
      return this.store.update<AlertRule>('alertRules', id, {
        ...input,
        ...(changed || previous.enabled !== input.enabled ? { pendingSince: null } : {})
      }, changed ? ['evaluation'] : [])
    })
    if (!result) throw new WorkspaceError({ statusCode: 409, statusMessage: 'Alert is being evaluated. Try again shortly.' })
    return result
  }

  async previewAlert(input: Omit<AlertRuleInput, 'name' | 'enabled' | 'telegramDestinationIds'>): Promise<AlertRulePreview> {
    const queryResult = await this.dataSources.query(input)
    return { ...evaluateThreshold(input, queryResult, this.clock.now().toISOString()), queryResult }
  }

  async evaluateAlert(id: string, scheduled = false) {
    const result = await this.store.withLock(id, async () => {
      const rule = await this.store.get<AlertRule>('alertRules', id)
      if (scheduled && !this.isDue(rule)) return undefined
      let evaluation: AlertEvaluation
      const time = this.clock.now().toISOString()
      try {
        evaluation = evaluateThreshold(rule, await this.dataSources.query(rule), time)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Query failed'
        evaluation = { time, value: null, state: 'error', message }
      }
      let pendingSince = rule.pendingSince ?? null
      if (evaluation.state === 'firing' && rule.pendingFor) {
        pendingSince ??= time
        if (Date.parse(time) - Date.parse(pendingSince) < rule.pendingFor * 1000) evaluation.state = 'pending'
      } else {
        pendingSince = null
      }
      const notified = new Set(rule.notifiedDestinations ?? [])
      const firing = evaluation.state === 'firing'
      const destinations = rule.telegramDestinationIds ?? []
      if (rule.enabled && (!rule.muteUntil || Date.parse(rule.muteUntil) <= this.clock.now().getTime()) && (firing || evaluation.state === 'normal')) {
        const pending = destinations.filter(destination => firing !== notified.has(destination))
        const text = `[${firing ? 'FIRING' : 'RECOVERED'}] ${rule.name}${rule.severity ? ' · ' + rule.severity.toUpperCase() : ''}${rule.summary ? '\n' + rule.summary : ''}\nValue: ${evaluation.value}\nThreshold: ${rule.operator} ${rule.threshold}\n${time}`
        const outcomes = await Promise.allSettled(pending.map(destination => this.telegram.send(destination, text)))
        const failed = outcomes.filter(outcome => outcome.status === 'rejected').length
        outcomes.forEach((outcome, index) => {
          const destination = pending[index]
          if (outcome.status !== 'fulfilled' || !destination) return
          if (firing) notified.add(destination)
          else notified.delete(destination)
        })
        if (failed) evaluation.deliveryError = `Telegram delivery failed for ${failed} destination(s). Check Configuration.`
      }
      await this.store.update<AlertRule>('alertRules', id, {
        evaluation, pendingSince, evaluationHistory: [evaluation, ...(rule.evaluationHistory ?? [])].slice(0, 50), notifiedDestinations: destinations.filter(destination => notified.has(destination))
      })
      return evaluation
    })
    if (!result && !scheduled) throw new WorkspaceError({ statusCode: 409, statusMessage: 'Alert is already being evaluated' })
    return result
  }

  private isDue(rule: AlertRule) {
    return rule.enabled && (!rule.evaluation || this.clock.now().getTime() - Date.parse(rule.evaluation.time) >= rule.interval * 1000)
  }

  async deleteAlert(id: string) {
    const removed = await this.store.withLock(id, async () => {
      await this.store.delete('alertRules', id)
      return true
    })
    if (!removed) throw new WorkspaceError({ statusCode: 409, statusMessage: 'Alert is being evaluated. Try again shortly.' })
  }

  async evaluateDueAlerts() {
    const due = (await this.store.list<AlertRule>('alertRules')).filter(rule => this.isDue(rule))
    for (let offset = 0; offset < due.length; offset += 4) {
      await Promise.allSettled(due.slice(offset, offset + 4).map(rule => this.evaluateAlert(rule.id, true)))
    }
  }

  list() { return this.store.list<AlertRule>('alertRules') }
}
