import type { AlertRule } from '#shared/domain/alert-rule'

export const useAlertRuleRecords = () => useResourceCollection<AlertRule>('alert-rules')
