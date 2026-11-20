import { PermissionService } from '~~/server/features/permissions/application/permission.service'
import { PostgresPermissionRepository } from '~~/server/features/permissions/infrastructure/permission.repository'
import { NotificationService } from '~~/server/features/notifications/application/notification.service'
import { PostgresNotificationRepository } from '~~/server/features/notifications/infrastructure/notification.repository'
import { readWorkspaceConfiguration } from './configuration'
import type { WorkspaceConfiguration } from './configuration'
import { DashboardDiagnostics } from '~~/server/features/dashboards/application/dashboard-diagnostics'
import { VariableResolver } from '~~/server/features/queries/application/variable-resolver'
import { PostgresDatabase } from '~~/server/platform/database/database'
import { AuthService } from '~~/server/features/auth/application/auth.service'
import { PostgresAuthenticationRepository } from '~~/server/features/auth/infrastructure/authentication.repository'
import { ScryptPasswordHasher } from '~~/server/features/auth/infrastructure/scrypt-password-hasher'
import { JwtAccessTokens } from '~~/server/features/auth/infrastructure/jwt-access-tokens'
import { OidcProviders } from '~~/server/features/auth/infrastructure/oidc-providers'
import { PostgresWorkspaceRepository } from '~~/server/platform/database/workspace.repository'
import { SystemClock } from '~~/server/platform/time/system-clock'
import { TelegramHttpGateway } from '~~/server/features/telegram/infrastructure/telegram-http-gateway'
import { CredentialVault } from '~~/server/platform/security/credential-vault'
import { InfluxClient } from '~~/server/features/queries/infrastructure/influx-client'
import { DashboardJsonImporter } from '~~/server/features/dashboards/infrastructure/dashboard-json-importer'
import { DataSourceService } from '~~/server/features/data-sources/application/data-source.service'
import { DashboardService } from '~~/server/features/dashboards/application/dashboard.service'
import { AlertService } from '~~/server/features/alerts/application/alert.service'
import { TelegramService } from '~~/server/features/telegram/application/telegram.service'

export function createWorkspace(configuration: WorkspaceConfiguration) {
  const database = new PostgresDatabase(configuration.databaseUrl)
  const repository = new PostgresWorkspaceRepository(database)
  const vault = new CredentialVault(configuration.secretKey)
  const dataSources = new DataSourceService(repository, vault, new InfluxClient())
  const telegram = new TelegramService(repository, vault, new TelegramHttpGateway())
  const variables = new VariableResolver(input => dataSources.query(input), () => dataSources.listSources())
  const diagnostics = new DashboardDiagnostics(input => dataSources.query(input), input => variables.resolve(input))
  const dashboards = new DashboardService(repository, dataSources, new DashboardJsonImporter(), variables, diagnostics)
  const notifications = new NotificationService(new PostgresNotificationRepository(database))
  const alerts = new AlertService(repository, dataSources, telegram, new SystemClock())
  const permissions = new PermissionService(new PostgresPermissionRepository(database), repository)
  const authenticationRepository = new PostgresAuthenticationRepository(database)
  const auth = new AuthService(authenticationRepository, new ScryptPasswordHasher(), new JwtAccessTokens(configuration.secretKey), configuration.allowOAuthSignup, permissions)
  const oidc = new OidcProviders(configuration.environment)
  return { database, dataSources, telegram, dashboards, alerts, notifications, permissions, auth, oidc, vault }
}
export type Workspace = ReturnType<typeof createWorkspace>
let workspace: Workspace | undefined
export function getWorkspace(): Workspace {
  if (workspace) return workspace
  return workspace = createWorkspace(readWorkspaceConfiguration())
}
export async function closeWorkspace() {
  await workspace?.database.close()
  workspace = undefined
}
