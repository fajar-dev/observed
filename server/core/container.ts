import { PostgresWorkspaceStore } from '../infrastructure/database/postgres-workspace-store'
import { SystemClock } from '../infrastructure/time/system-clock'
import { TelegramHttpGateway } from '../infrastructure/telegram/telegram-http-gateway'
import { CredentialVault } from '../infrastructure/security/credential-vault'
import { InfluxClient } from '../infrastructure/influx/influx-client'
import { DashboardJsonImporter } from '../infrastructure/imports/dashboard-json-importer'
import { DataSourceService } from '../application/data-sources/data-source-service'
import { DashboardService } from '../application/dashboards/dashboard-service'
import { AlertService } from '../application/alerts/alert-service'
import { TelegramService } from '../application/telegram/telegram-service'

export function createWorkspace(connectionString: string, encryptionKey: string) {
  const store = new PostgresWorkspaceStore(connectionString)
  const vault = new CredentialVault(encryptionKey)
  const dataSources = new DataSourceService(store, vault, new InfluxClient())
  const telegram = new TelegramService(store, vault, new TelegramHttpGateway())
  const dashboards = new DashboardService(store, dataSources, new DashboardJsonImporter())
  const alerts = new AlertService(store, dataSources, telegram, new SystemClock())
  return { store, dataSources, telegram, dashboards, alerts }
}
export type Workspace = ReturnType<typeof createWorkspace>
let workspace: Workspace | undefined
export function getWorkspace(): Workspace {
  if (workspace) return workspace
  const connection = process.env.DATABASE_URL
  if (!connection) throw createError({ statusCode: 503, statusMessage: 'Configure DATABASE_URL' })
  return workspace = createWorkspace(connection, process.env.OBSERVE_SECRET_KEY ?? '')
}
export async function closeWorkspace() {
  await workspace?.store.close()
  workspace = undefined
}
