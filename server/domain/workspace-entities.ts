import type { AlertRule } from '#shared/domain/alert-rule'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { DataSourceInput } from '#shared/domain/data-source'

export type StoredDataSource = Omit<DataSourceInput, 'secret'> & { ciphertext?: string }
export type StoredTelegramDestination = { name: string, chatId: string, ciphertext: string }
export type DashboardVersion = { dashboardId: string, snapshot: DashboardDefinition }
export type ResourceValues = {
  dataSources: StoredDataSource
  telegramDestinations: StoredTelegramDestination
  dashboardFolders: { name: string }
  dashboards: DashboardDefinition
  dashboardVersions: DashboardVersion
  alertRules: Omit<AlertRule, 'id'>
}
export type Resource = keyof ResourceValues
export type StoredEntity<T> = T & { id: string, updatedAt: string, createdBy?: string }
