import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { launchOptions } from '../browser/environment.mjs'

const origin = process.env.DOCKER_TEST_URL
const settings = process.env.DOCKER_TEST_ENV_FILE
const project = process.env.DOCKER_TEST_PROJECT

test('Docker runtime supports auth, sensor queries, notifications, persistence, backups and readiness', { skip: !origin || !settings || !project, timeout: 180000 }, async (t) => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use an isolated local Docker deployment')
  assert.ok(project.endsWith('-smoke'), 'Use a dedicated project ending in -smoke')
  const compose = (args, input) => execFileSync('docker', ['compose', '--env-file', settings, '-p', project, ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const appId = compose(['ps', '-q', 'app'])
  const inspect = JSON.parse(execFileSync('docker', ['inspect', '--format', '{{json .HostConfig}}', appId], { encoding: 'utf8' }))
  assert.equal(inspect.ReadonlyRootfs, true)
  assert.ok(inspect.CapDrop.includes('ALL'))
  assert.equal(execFileSync('docker', ['inspect', '--format', '{{.Config.User}}', appId], { encoding: 'utf8' }).trim(), 'bun')
  compose(['exec', '-T', 'app', 'sh', '-c', 'test ! -e /app/.env && test ! -e /app/.env.docker && test ! -e /app/node_modules'])
  assert.equal(compose(['exec', '-T', 'database', 'sh', '-c', 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE oid=(SELECT datdba FROM pg_database WHERE datname=current_database())"']), 'f|f|f')
  let token, sample = 1.2
  const directory = mkdtempSync(join(tmpdir(), 'observed-docker-'))
  const influx = createServer((request, response) => {
    request.resume()
    request.on('end', () => {
      response.writeHead(200, { 'Content-Type': 'text/csv' })
      response.end('#datatype,string,long,dateTime:RFC3339,double\n,result,table,_time,_value\n,,0,' + new Date().toISOString() + ',' + sample + '\n')
    })
  })
  await new Promise(resolve => influx.listen(0, '0.0.0.0', resolve))
  async function api(path, method = 'GET', data) {
    const response = await fetch(origin + '/api/observe/' + path, {
      method, headers: { origin, 'connection': 'close', 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(15000)
    })
    assert.ok(response.ok, path + ': HTTP ' + response.status)
    return response.json()
  }
  try {
    const ready = await fetch(origin + '/api/health', { headers: { connection: 'close' } })
    assert.equal(ready.status, 200)
    assert.equal(ready.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await ready.json(), { status: 'ok' })
    const config = await api('auth/config')
    assert.deepEqual(config.providers, [])
    const credentials = { email: 'docker-admin@example.test', password: 'docker-smoke-test-password' }
    const session = await api('auth/' + (config.setupRequired ? 'setup' : 'sign-in'), 'POST', { ...credentials, ...(config.setupRequired ? { name: 'Docker test engineer' } : {}) })
    token = session.accessToken
    const source = await api('data-sources', 'POST', { name: 'Docker sensor ' + randomUUID(), url: 'http://host.docker.internal:' + influx.address().port, queryLanguage: 'flux', organization: 'sensors', database: 'bridge', secret: 'test-only-token' })
    const query = 'from(bucket: v.defaultBucket) |> range(start: v.timeRangeStart, stop: v.timeRangeStop) |> last()'
    assert.equal((await api('queries', 'POST', { dataSourceId: source.id, query, range: '1h' })).rows[0]._value, sample)
    t.diagnostic('Runtime privileges, authentication and container-to-host sensor query passed')
    const dashboard = await api('dashboards', 'POST', { name: 'Docker bridge ' + randomUUID(), description: '', range: '1h', refresh: 'auto', panels: [] })
    const alert = await api('alert-rules', 'POST', { name: 'Docker tilt ' + randomUUID(), dataSourceId: source.id, query, range: '1h', enabled: true, interval: 60, telegramDestinationIds: [], field: '_value', reducer: 'last', operator: 'gt', threshold: 0.5 })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const stream = await fetch(origin + '/api/observe/notifications/stream', { headers: { authorization: 'Bearer ' + token }, signal: controller.signal })
      assert.ok(stream.headers.get('content-type').includes('text/event-stream'))
      const reader = stream.body.getReader(), decoder = new TextDecoder()
      await reader.read()
      await api('alert-rules/' + alert.id + '/evaluate', 'POST')
      let frame = ''
      while (!frame.includes(alert.id)) {
        const part = await reader.read()
        assert.equal(part.done, false)
        frame += decoder.decode(part.value, { stream: true })
      }
      assert.ok(frame.includes('firing'))
    } finally {
      clearTimeout(timeout)
      controller.abort()
    }
    sample = 0.2
    await api('alert-rules/' + alert.id + '/evaluate', 'POST')
    const events = (await api('notifications')).items.filter(item => item.alertRuleId === alert.id)
    assert.deepEqual(events.map(event => event.state).sort(), ['firing', 'recovered'])
    const backup = join(directory, 'observed.dump')
    execFileSync('sh', ['docker/backup.sh', backup], { env: { ...process.env, OBSERVE_ENV_FILE: settings, COMPOSE_PROJECT_NAME: project }, stdio: 'pipe' })
    assert.ok(readFileSync(backup).subarray(0, 5).equals(Buffer.from('PGDMP')))
    t.diagnostic('Firing/recovery, direct SSE and database backup passed')
    compose(['up', '-d', '--no-build', '--no-deps', '--force-recreate', '--wait', 'app'])
    assert.equal((await api('auth/config')).setupRequired, false)
    assert.equal((await api('dashboards/' + dashboard.id)).refresh, 'auto')
    t.diagnostic('App recreation preserved setup, sessions and dashboards')
    compose(['stop', 'database'])
    try {
      const unavailable = await fetch(origin + '/api/health', { headers: { connection: 'close' }, signal: AbortSignal.timeout(12000) })
      assert.equal(unavailable.status, 503)
      assert.deepEqual(await unavailable.json(), { status: 'unavailable' })
    } finally { compose(['up', '-d', '--no-build', '--wait', 'database']) }
    t.diagnostic('Database outage and readiness recovery passed')
    compose(['stop', 'app'])
    try {
      compose(['exec', '-T', 'database', 'sh', '-c', 'exec pg_restore --clean --if-exists --single-transaction --exit-on-error --no-owner --no-acl --username="$POSTGRES_USER" --role="$OBSERVE_DB_USER" --dbname="$POSTGRES_DB"'], readFileSync(backup))
    } finally { compose(['up', '-d', '--no-build', '--wait', 'app']) }
    assert.equal((await api('dashboards/' + dashboard.id)).refresh, 'auto')
    assert.equal((await api('queries', 'POST', { dataSourceId: source.id, query, range: '1h' })).rows[0]._value, sample)
    const browser = await chromium.launch(launchOptions)
    try {
      const page = await browser.newPage(), errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(origin + '/sign-in')
      await page.getByLabel('Email', { exact: true }).fill(credentials.email)
      await page.getByLabel('Password', { exact: true }).fill(credentials.password)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await page.waitForURL(url => url.pathname === '/')
      await page.goto(origin + '/dashboards/' + dashboard.id)
      await page.getByRole('heading', { name: dashboard.name, exact: true }).waitFor()
      await page.getByRole('button', { name: 'Notifications', exact: true }).waitFor()
      await page.screenshot({ path: '/tmp/observed-docker-dashboard.png' })
      assert.deepEqual(errors, [])
    } finally { await browser.close() }
    t.diagnostic('Backup restore, credential decryption and browser sign-in passed')
  } finally {
    await new Promise(resolve => influx.close(resolve))
    rmSync(directory, { recursive: true, force: true })
  }
})
