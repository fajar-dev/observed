import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { configureContainerEnvironment } from '../../docker/environment.mjs'

const key = () => randomBytes(32).toString('base64')
test('container setup encodes database credentials and supports an external database', () => {
  const environment = { OBSERVE_SECRET_KEY: key(), POSTGRES_USER: 'sensor@team', POSTGRES_PASSWORD: 'special:/?#@%password', POSTGRES_DB: 'observed metrics' }
  configureContainerEnvironment(environment)
  const url = new URL(environment.DATABASE_URL)
  assert.equal(decodeURIComponent(url.username), environment.POSTGRES_USER)
  assert.equal(decodeURIComponent(url.password), environment.POSTGRES_PASSWORD)
  assert.equal(decodeURIComponent(url.pathname.slice(1)), environment.POSTGRES_DB)
  assert.equal(url.hostname, 'database')
  const external = { OBSERVE_SECRET_KEY: key(), DATABASE_URL: 'postgresql://existing.example.test/observed' }
  configureContainerEnvironment(external)
  assert.equal(external.DATABASE_URL, 'postgresql://existing.example.test/observed')
})

test('container setup supports secret files, fails closed and never echoes secret values', () => {
  const directory = mkdtempSync(join(tmpdir(), 'observed-container-'))
  try {
    const secret = key(), file = join(directory, 'key')
    writeFileSync(file, secret + '\n')
    const environment = { OBSERVE_SECRET_KEY_FILE: file, POSTGRES_PASSWORD: 'test-only-password' }
    configureContainerEnvironment(environment)
    assert.equal(environment.OBSERVE_SECRET_KEY, secret)
    assert.throws(() => configureContainerEnvironment({ ...environment, OBSERVE_SECRET_KEY_FILE: file }), /Set only OBSERVE_SECRET_KEY or/)
    assert.throws(() => configureContainerEnvironment({ OBSERVE_SECRET_KEY: 'invalid-secret-value' }), error => !error.message.includes('invalid-secret-value'))
    assert.throws(() => configureContainerEnvironment({ OBSERVE_SECRET_KEY: key(), DATABASE_URL: 'https://private:secret@example.test' }), error => !error.message.includes('private:secret'))
    assert.throws(() => configureContainerEnvironment({ OBSERVE_SECRET_KEY: key() }), /Set DATABASE_URL or POSTGRES_PASSWORD/)
    assert.throws(() => configureContainerEnvironment({ OBSERVE_SECRET_KEY_FILE: join(directory, 'absent') }), /Cannot read OBSERVE_SECRET_KEY_FILE/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('setup creates private credentials once and preserves the encryption key on repeated runs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'observed-setup-'))
  try {
    const file = join(directory, 'settings.env')
    execFileSync('sh', ['docker/setup.sh', file], { stdio: 'pipe' })
    const initial = readFileSync(file, 'utf8')
    const values = Object.fromEntries(initial.split('\n').filter(line => line && !line.startsWith('#')).map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }))
    assert.equal(Buffer.from(values.OBSERVE_SECRET_KEY, 'base64').length, 32)
    assert.match(values.POSTGRES_PASSWORD, /^[a-f0-9]{64}$/)
    assert.notEqual(values.POSTGRES_PASSWORD, values.POSTGRES_ADMIN_PASSWORD)
    assert.equal(statSync(file).mode & 0o777, 0o600)
    execFileSync('sh', ['docker/setup.sh', file], { stdio: 'pipe' })
    assert.equal(readFileSync(file, 'utf8'), initial)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
