import { readFileSync } from 'node:fs'

const fileVariables = ['DATABASE_URL', 'POSTGRES_PASSWORD', 'OBSERVE_SECRET_KEY', 'OBSERVE_GOOGLE_CLIENT_SECRET', 'OBSERVE_MICROSOFT_CLIENT_SECRET']

/** Resolve optional Docker secret files and construct an encoded connection URL. */
export function configureContainerEnvironment(environment) {
  for (const name of fileVariables) {
    const file = environment[name + '_FILE']
    if (!file) continue
    if (environment[name]) throw new Error('Set only ' + name + ' or ' + name + '_FILE')
    try {
      environment[name] = readFileSync(file, 'utf8').trim()
    } catch { throw new Error('Cannot read ' + name + '_FILE') }
  }
  if (Buffer.from(environment.OBSERVE_SECRET_KEY || '', 'base64').length !== 32) throw new Error('Set a 32-byte base64 OBSERVE_SECRET_KEY')
  if (!environment.DATABASE_URL) {
    if (!environment.POSTGRES_PASSWORD) throw new Error('Set DATABASE_URL or POSTGRES_PASSWORD')
    const url = new URL('postgresql://database:5432/observed')
    url.hostname = environment.POSTGRES_HOST || 'database'
    url.port = environment.POSTGRES_PORT || '5432'
    url.username = encodeURIComponent(environment.POSTGRES_USER || 'observed')
    url.password = encodeURIComponent(environment.POSTGRES_PASSWORD)
    url.pathname = '/' + encodeURIComponent(environment.POSTGRES_DB || 'observed')
    environment.DATABASE_URL = url.href
  }
  try {
    if (!['postgres:', 'postgresql:'].includes(new URL(environment.DATABASE_URL).protocol)) throw new Error('Invalid protocol')
  } catch { throw new Error('Set a valid PostgreSQL DATABASE_URL') }
}
