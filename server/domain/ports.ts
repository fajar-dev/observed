import type { AlertNotificationInput } from '#shared/domain/notification'
import type { VariableResolution, VariableResolutionInput } from '#shared/domain/variable'
import type { DashboardDiagnostic, DashboardDefinition } from '#shared/domain/dashboard'
import type { DataSource, DataSourceInput } from '#shared/domain/data-source'
import type { QueryRequest, QueryResponse } from '#shared/domain/query'
import type { TelegramDestination } from '#shared/domain/telegram-destination'

import type { Resource, ResourceValues, StoredEntity, DashboardVersion } from './workspace-entities'

export type { Resource, ResourceValues, StoredEntity } from './workspace-entities'

export interface WorkspaceRepository {
  list<K extends Resource>(resource: K, ids?: string[]): Promise<StoredEntity<ResourceValues[K]>[]>
  find<K extends Resource>(resource: K, id: string): Promise<StoredEntity<ResourceValues[K]> | undefined>
  get<K extends Resource>(resource: K, id: string): Promise<StoredEntity<ResourceValues[K]>>
  create<K extends Resource>(resource: K, value: ResourceValues[K], creatorId?: string): Promise<StoredEntity<ResourceValues[K]>>
  update<K extends Resource>(resource: K, id: string, patch: Partial<ResourceValues[K]>, remove?: string[]): Promise<StoredEntity<ResourceValues[K]>>
  saveAlertEvaluation(id: string, patch: Partial<ResourceValues['alertRules']>, notification?: AlertNotificationInput): Promise<void>
  delete(resource: Resource, id: string): Promise<void>
  saveDashboard(id: string, value: DashboardDefinition): Promise<StoredEntity<DashboardDefinition>>
  isReferenced(resource: 'dataSources' | 'telegramDestinations' | 'dashboardFolders', id: string): Promise<boolean>
  dueAlerts(now: Date): Promise<StoredEntity<ResourceValues['alertRules']>[]>
  versions(dashboardId: string): Promise<StoredEntity<DashboardVersion>[]>
  withLock<T>(id: string, action: () => Promise<T>): Promise<T | undefined>
}
export interface SecretVault { encrypt(value: string): string, decrypt(value: string): string }
export interface QueryGateway { query(source: DataSourceInput, input: Omit<QueryRequest, 'dataSourceId'>): Promise<QueryResponse> }
export interface DataSourceAccess {
  listSources(): Promise<DataSource[]>
  query(input: QueryRequest): Promise<QueryResponse>
  validateSources(ids: string[]): Promise<void>
}
export type TelegramMessageOptions = { parseMode?: 'HTML' }
export interface TelegramAccess { list(): Promise<TelegramDestination[]>, send(id: string, text: string, options?: TelegramMessageOptions): Promise<void> }
export interface DashboardImporter { convert(document: unknown, source: DataSource | null): { dashboard: DashboardDefinition, warnings: string[] } }
export interface TelegramTransport { send(token: string, chatId: string, text: string, options?: TelegramMessageOptions): Promise<void> }
export interface Clock { now(): Date }
export interface DashboardVariableResolver { resolve(input: VariableResolutionInput): Promise<VariableResolution> }
export interface DashboardChecker { check(input: DashboardDefinition): Promise<DashboardDiagnostic> }
