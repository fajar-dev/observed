import { WorkspaceError } from '~~/server/domain/workspace-error'

export type WorkspaceConfiguration = { databaseUrl: string, secretKey: string, environment: NodeJS.ProcessEnv, allowOAuthSignup: boolean }
export function readWorkspaceConfiguration(environment: NodeJS.ProcessEnv = process.env): WorkspaceConfiguration {
  const databaseUrl = environment.DATABASE_URL
  const secretKey = environment.OBSERVE_SECRET_KEY || ''
  if (!databaseUrl) throw new WorkspaceError({ statusCode: 503, statusMessage: 'Configure DATABASE_URL' })
  try {
    if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)) throw new Error('Invalid protocol')
  } catch { throw new WorkspaceError({ statusCode: 503, statusMessage: 'Configure a valid PostgreSQL DATABASE_URL' }) }
  if (Buffer.from(secretKey, 'base64').length !== 32) throw new WorkspaceError({ statusCode: 503, statusMessage: 'Set a 32-byte base64 OBSERVE_SECRET_KEY' })
  return { databaseUrl, secretKey, environment: { ...environment }, allowOAuthSignup: environment.OBSERVE_OAUTH_ALLOW_SIGNUP === 'true' }
}
