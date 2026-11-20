import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { exerciseSensorAlertFlow } from './sensor-alert-flow.mjs'

const connection = process.env.NOTIFICATION_TEST_DATABASE_URL

test('live inbox pushes firing/recovery toasts, persists per-user reads and fits mobile', { skip: !connection }, async () => {
  assert.ok(new URL(connection).pathname.endsWith('_test'), 'Use an isolated test database')
  const pool = new pg.Pool({ connectionString: connection })
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const configuration = await (await context.request.get(baseUrl + '/api/observe/auth/config')).json()
    const login = await context.request.post(baseUrl + '/api/observe/auth/' + (configuration.setupRequired ? 'setup' : 'sign-in'), { headers: { origin: baseUrl }, data: { email: 'notifications@example.test', password: 'notification-test-password', ...(configuration.setupRequired ? { name: 'Monitoring engineer' } : {}) } })
    assert.equal(login.ok(), true, await login.text())
    await pool.query('TRUNCATE observe.alert_notifications CASCADE')
    const event = async (name, state) => {
      const item = { alertRuleId: randomUUID(), alertName: name, sourceName: 'Bridge sensors', state, value: state === 'firing' ? 0.7 : 0.2, threshold: 0.5, operator: 'gt', severity: 'warning', summary: 'Check the sensor measurements on the bridge pier.', occurredAt: new Date().toISOString() }
      await pool.query('INSERT INTO observe.alert_notifications(id,alert_rule_id,occurred_at,payload) VALUES($1,$2,$3,$4)', [randomUUID(), item.alertRuleId, item.occurredAt, JSON.stringify(item)])
    }
    await event('Previous pier tilt', 'firing')
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) errors.push(message.text())
    })
    await page.goto(baseUrl)
    const notificationButton = page.getByRole('button', { name: 'Notifications', exact: true })
    await notificationButton.waitFor()
    const headerSizes = await page.locator('button').evaluateAll(buttons => buttons.filter(button => button.getBoundingClientRect().height > 0 && (['Notifications', 'Account menu'].includes(button.getAttribute('aria-label')) || button.textContent.includes('Search'))).map(button => ({ height: button.getBoundingClientRect().height, name: button.getAttribute('aria-label') || 'Search' })))
    assert.equal(headerSizes.length, 3)
    assert.ok(headerSizes.every(item => item.height === 32), JSON.stringify(headerSizes))
    assert.equal(await notificationButton.evaluate(element => parseFloat(getComputedStyle(element).borderRadius) >= element.clientHeight / 2), true)
    await notificationButton.click()
    await page.getByText('Previous pier tilt', { exact: true }).waitFor()
    assert.equal(await page.getByRole('region', { name: 'Alert notifications' }).locator('footer').count(), 0)
    assert.equal(await page.getByText('Firing · Previous pier tilt', { exact: true }).count(), 0, 'Old events must not replay as toasts')
    await event('Deck strain', 'firing')
    await page.getByText('Firing · Deck strain', { exact: true }).waitFor({ timeout: 10000 })
    await page.getByRole('listitem').filter({ has: page.getByText('Deck strain', { exact: true }) }).getByRole('button', { name: 'Mark as read' }).click()
    await page.getByRole('listitem').filter({ has: page.getByText('Deck strain', { exact: true }) }).getByRole('button', { name: 'Mark as read' }).waitFor({ state: 'hidden' })
    assert.equal((await (await context.request.get(baseUrl + '/api/observe/notifications')).json()).unread, 1)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
      await page.waitForTimeout(200)
      const panel = page.getByRole('region', { name: 'Alert notifications' })
      await panel.waitFor()
      const bounds = await panel.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, JSON.stringify(bounds))
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= (width === 320 ? 568 : 900) + 1, JSON.stringify(bounds))
      if (width === 320) await page.screenshot({ path: '/tmp/observed-notifications-mobile.png' })
    }
    await event('Deck strain', 'recovered')
    await page.getByText('Recovered · Deck strain', { exact: true }).waitFor({ timeout: 10000 })
    await page.getByRole('button', { name: 'Mark all read', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[aria-label="Alert notifications"] button')?.disabled)
    assert.equal((await (await context.request.get(baseUrl + '/api/observe/notifications')).json()).unread, 0)
    await page.reload()
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await page.getByText('Previous pier tilt', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Mark as read', exact: true }).count(), 0)
    assert.equal(await page.getByText('Recovered · Deck strain', { exact: true }).count(), 0)
    // All roles receive automatic in-app alerts, independently of Telegram and other users' reads.
    const userEmail = randomUUID() + '@example.test'
    const createUser = await context.request.post(baseUrl + '/api/observe/users', { headers: { origin: baseUrl }, data: { name: 'Asset owner', email: userEmail, role: 'viewer', enabled: true, password: 'notification-test-password' } })
    assert.ok(createUser.ok(), await createUser.text())
    const createdViewer = await createUser.json()
    const grantAlerts = await context.request.put(baseUrl + '/api/observe/users/' + createdViewer.id + '/permissions', { headers: { origin: baseUrl }, data: { dashboards: { scope: 'none', access: 'view', grants: [] }, alerts: { scope: 'all', access: 'view', grants: [] } } })
    assert.ok(grantAlerts.ok(), await grantAlerts.text())
    const viewer = await browser.newContext()
    const viewerLogin = await viewer.request.post(baseUrl + '/api/observe/auth/sign-in', { headers: { origin: baseUrl }, data: { email: userEmail, password: 'notification-test-password' } })
    assert.ok(viewerLogin.ok())
    const unread = await (await viewer.request.get(baseUrl + '/api/observe/notifications')).json()
    assert.equal(unread.unread, 3)
    const forbidden = await viewer.request.post(baseUrl + '/api/observe/data-sources', { headers: { origin: baseUrl }, data: {} })
    assert.equal(forbidden.status(), 403)
    await viewer.close()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1440, height: 900 })
    const source = await context.request.post(baseUrl + '/api/observe/data-sources', { headers: { origin: baseUrl }, data: { name: 'Bridge sensors ' + randomUUID(), url: 'http://influx.example.test', queryLanguage: 'flux', organization: 'sensors', database: 'bridge', secret: 'test-only-token' } })
    assert.ok(source.ok(), await source.text())
    await page.route('**/api/observe/queries', route => route.fulfill({ json: { columns: [], rows: [], duration: 1, truncated: false } }))
    await page.goto(baseUrl + '/alerts?new=1')
    const editor = page.getByRole('dialog', { name: 'New alert rule', exact: true })
    await editor.waitFor()
    const ruleName = 'Bridge tilt ' + randomUUID()
    await editor.getByRole('textbox', { name: 'Rule name' }).fill(ruleName)
    await editor.getByRole('tab', { name: 'Code', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Query', exact: true }).fill('from(bucket: "bridge") |> range(start: -15m)')
    await editor.getByRole('button', { name: 'Save rule', exact: true }).click()
    await editor.waitFor({ state: 'hidden' })
    const rules = await (await context.request.get(baseUrl + '/api/observe/alert-rules')).json()
    assert.deepEqual(rules.find(rule => rule.name === ruleName).telegramDestinationIds, [], 'UI saves an alert without any Telegram configuration')
    await event('Before sign out', 'firing')
    await page.getByText('Firing · Before sign out', { exact: true }).waitFor({ timeout: 10000 })
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
    await page.waitForURL(url => url.pathname === '/sign-in')
    await page.getByText('Firing · Before sign out', { exact: true }).waitFor({ state: 'hidden' })
    await event('After sign out', 'firing')
    await page.waitForTimeout(2500)
    assert.equal(await page.getByText('Firing · After sign out', { exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    await exerciseSensorAlertFlow(browser)
  } finally {
    await browser.close()
    await pool.end()
  }
})
