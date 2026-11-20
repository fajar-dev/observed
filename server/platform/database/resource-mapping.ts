import type { Resource } from '~~/server/domain/ports'

type Field = { column: string, fallback?: unknown }
export type ResourceMapping = { table: string, fields: Record<string, Field>, payload?: string, runtime?: readonly string[] }
export const resourceMappings: Record<Resource, ResourceMapping> = {
  dataSources: { table: 'data_sources', fields: {
    name: { column: 'name' }, url: { column: 'url' }, queryLanguage: { column: 'query_language' },
    organization: { column: 'organization', fallback: '' }, database: { column: 'database_name' },
    username: { column: 'username', fallback: '' }, ciphertext: { column: 'credential_ciphertext' }
  } },
  telegramDestinations: { table: 'telegram_destinations', fields: {
    name: { column: 'name' }, chatId: { column: 'chat_id' }, ciphertext: { column: 'bot_token_ciphertext' }
  } },
  dashboardFolders: { table: 'dashboard_folders', fields: { name: { column: 'name' } } },
  dashboards: { table: 'dashboards', fields: {
    name: { column: 'name' }, description: { column: 'description', fallback: '' }, folder: { column: 'folder_name', fallback: '' },
    tags: { column: 'tags', fallback: [] }, revision: { column: 'revision', fallback: 1 }
  }, payload: 'definition' },
  dashboardVersions: { table: 'dashboard_versions', fields: { dashboardId: { column: 'dashboard_id' }, snapshot: { column: 'snapshot' } } },
  alertRules: { table: 'alert_rules', fields: {
    name: { column: 'name' }, dataSourceId: { column: 'data_source_id' }, folder: { column: 'folder_name', fallback: '' },
    enabled: { column: 'enabled' }, interval: { column: 'evaluation_interval' }
  }, payload: 'configuration', runtime: ['evaluation', 'evaluationHistory', 'pendingSince', 'notifiedDestinations', 'notificationFiring'] }
}
export type DatabaseRow = { id: string, created_at: Date, updated_at: Date, [column: string]: unknown }

export function decodeResource<T>(mapping: ResourceMapping, row: DatabaseRow): T & { id: string, updatedAt: string } {
  const value: Record<string, unknown> = { ...(mapping.payload ? row[mapping.payload] as object : {}), ...(mapping.runtime ? row.runtime as object : {}) }
  for (const [property, field] of Object.entries(mapping.fields)) {
    const stored = row[field.column] ?? field.fallback
    if (stored !== undefined && stored !== null) value[property] = stored
  }
  return { ...value, id: row.id, updatedAt: row.updated_at.toISOString() } as T & { id: string, updatedAt: string }
}

export function encodeResource(mapping: ResourceMapping, value: object) {
  const input = value as Record<string, unknown>
  const row: Record<string, unknown> = {}
  for (const [property, field] of Object.entries(mapping.fields)) {
    row[field.column] = input[property] ?? field.fallback ?? null
    if (field.column === 'folder_name' && !input[property]) row[field.column] = null
  }
  const omitted = new Set(['id', 'updatedAt', 'createdAt', ...Object.keys(mapping.fields), ...(mapping.runtime ?? [])])
  if (mapping.payload) row[mapping.payload] = Object.fromEntries(Object.entries(input).filter(([key]) => !omitted.has(key)))
  if (mapping.runtime) row.runtime = Object.fromEntries(mapping.runtime.filter(key => input[key] !== undefined).map(key => [key, input[key]]))
  return row
}
