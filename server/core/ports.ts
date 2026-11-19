import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { DataSource, DataSourceInput } from '#shared/domain/data-source'
import type { QueryRequest, QueryResponse } from '#shared/domain/query'
import type { TelegramDestination } from '#shared/domain/telegram-destination'

export type Resource = 'dataSources' | 'dashboards' | 'alertRules' | 'telegramDestinations' | 'dashboardFolders' | 'dashboardVersions'
export type StoredEntity<T> = T & { id: string, updatedAt: string }
export interface WorkspaceStore {
  list<T>(resource: Resource): Promise<StoredEntity<T>[]>
  find<T>(resource: Resource, id: string): Promise<StoredEntity<T> | undefined>
  get<T>(resource: Resource, id: string): Promise<StoredEntity<T>>
  create<T>(resource: Resource, value: T): Promise<StoredEntity<T>>
  update<T>(resource: Resource, id: string, patch: Partial<T>, remove?: string[]): Promise<StoredEntity<T>>
  delete(resource: Resource, id: string): Promise<void>
  saveDashboard(id: string, value: DashboardDefinition): Promise<StoredEntity<DashboardDefinition>>
  withLock<T>(id: string, action: () => Promise<T>): Promise<T | undefined>
}
export interface SecretVault { encrypt(value: string): string, decrypt(value: string): string }
export interface QueryGateway { query(source: DataSourceInput, input: Omit<QueryRequest, 'dataSourceId'>): Promise<QueryResponse> }
export interface DataSourceAccess {
  listSources(): Promise<DataSource[]>
  query(input: QueryRequest): Promise<QueryResponse>
  validateSources(ids: string[]): Promise<void>
}
export interface TelegramAccess { list(): Promise<TelegramDestination[]>, send(id: string, text: string): Promise<void> }
export interface DashboardImporter { convert(document: unknown, source: DataSource | null): { dashboard: DashboardDefinition, warnings: string[] } }
export interface TelegramTransport { send(token: string, chatId: string, text: string): Promise<void> }
export interface Clock { now(): Date }
