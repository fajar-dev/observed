import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

async function home(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const configuration = { role: 'admin', dashboards: [], alerts: [], sources: [state.source], failed: false, ...options }
  const user = { id: randomUUID(), name: 'Jordan Engineer', email: 'home@example.test', enabled: true, realtimeAlertToasts: false, role: configuration.role }
  await context.route('**/api/observe/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
    if (configuration.failed && ['dashboards', 'alert-rules'].includes(path)) return route.fulfill({ status: 503, json: { statusMessage: 'Temporarily unavailable' } })
    const notification = { items: configuration.events ?? [], events: [], unread: 0, cursor: '0' }
    if (path === 'notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'event: notifications\ndata: ' + JSON.stringify(notification) + '\n\n' })
    const records = { 'auth/session': { user, canRefresh: false }, 'auth/config': { setupRequired: false, providers: [] }, 'data-sources': configuration.sources, 'telegram-destinations': configuration.destinations ?? [], 'dashboards': configuration.dashboards, 'alert-rules': configuration.alerts, 'notifications': notification, 'dashboard-folders': [] }
    return route.fulfill({ json: records[path] ?? [] })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(baseUrl)
  await page.getByRole('heading', { name: 'Welcome back, Jordan', exact: true }).waitFor()
  return { page, context, configuration, errors }
}

test('home prioritizes actual alert conditions and displays permitted dashboards and activity', { timeout: 90000 }, async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const dashboards = Array.from({ length: 6 }, (_, index) => ({ ...state.dashboard, id: randomUUID(), name: `Bridge ${index + 1} sensors`, description: 'Structural measurements and trends.' }))
    const rules = ['normal', 'firing', 'error', 'no_data', undefined].map((phase, index) => ({ ...state.alert, id: randomUUID(), name: `Rule ${index}`, evaluation: phase ? { state: phase, value: phase === 'error' || phase === 'no_data' ? null : 1, time: new Date().toISOString() } : undefined }))
    rules.push({ ...state.alert, id: randomUUID(), name: 'Paused threshold', enabled: false, evaluation: { state: 'firing', value: 90, time: new Date().toISOString() } })
    const events = [{ id: randomUUID(), alertRuleId: rules[1].id, alertName: 'Pier tilt recovery', sourceName: state.source.name, state: 'recovered', occurredAt: new Date().toISOString(), sequence: '1', readAt: null }]
    const { page, errors } = await home(browser, { dashboards, alerts: rules, events, destinations: [state.first, state.second] })
    const panel = page.getByRole('region', { name: 'Alerts needing attention' })
    await panel.getByText('Not evaluated', { exact: true }).waitFor()
    assert.deepEqual(await panel.locator('li').evaluateAll(rows => rows.map(row => row.querySelector('p').textContent.trim())), ['Rule 1', 'Rule 2', 'Rule 3', 'Rule 4'])
    for (const label of ['Firing', 'Error', 'No data', 'Not evaluated']) assert.equal(await panel.getByText(label, { exact: true }).count(), 1)
    const summary = page.getByRole('region', { name: 'Monitoring summary' })
    await summary.getByText('Telegram destinations', { exact: true }).waitFor()
    assert.equal(await summary.getByText('Needs attention', { exact: true }).count(), 0)
    for (const count of ['6', '5', '2', '1']) assert.equal(await summary.getByText(count, { exact: true }).count(), 1)
    const activity = page.getByRole('region', { name: 'Recent monitoring activity' })
    await activity.getByText('Pier tilt recovery', { exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: dashboards[0].name, exact: true }).getAttribute('href'), '/dashboards/' + dashboards[0].id)
    assert.equal(await page.title(), 'Overview · Observed')
    assert.equal(await page.getByRole('navigation', { name: 'Quick access', exact: true }).count(), 0)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(100)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Home overflow at ' + width)
    }
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('home distinguishes onboarding and restricted accounts without advertising administrator actions', { timeout: 90000 }, async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const admin = await home(browser, { sources: [] })
    await admin.page.getByRole('link', { name: 'Add data source', exact: true }).waitFor()
    assert.deepEqual(admin.errors, [])
    await admin.context.close()
    const viewer = await home(browser, { role: 'viewer' })
    await viewer.page.getByText('Your monitoring home is ready', { exact: true }).waitFor()
    assert.equal(await viewer.page.getByRole('button', { name: 'Quick access', exact: true }).count(), 0)
    assert.equal(await viewer.page.getByRole('link', { name: 'Configuration', exact: true }).count(), 0)
    assert.equal(await viewer.page.getByRole('button', { name: 'Account menu', exact: true }).count(), 1)
    assert.equal(await viewer.page.getByRole('region', { name: 'Alerts needing attention' }).count(), 0)
    assert.deepEqual(viewer.errors, [])
    await viewer.context.close()
    const editor = await home(browser, { role: 'editor' })
    await editor.page.getByRole('button', { name: 'Quick access', exact: true }).waitFor()
    await editor.page.getByRole('button', { name: 'Quick access', exact: true }).click()
    assert.equal(await editor.page.getByRole('menuitem', { name: 'New dashboard', exact: true }).getAttribute('href'), '/dashboards/new')
    assert.equal(await editor.page.getByRole('menuitem', { name: 'New alert rule', exact: true }).getAttribute('href'), '/alerts?new=1')
    assert.equal(await editor.page.getByRole('menuitem', { name: 'Import JSON', exact: true }).count(), 0)
    await editor.page.keyboard.press('Escape')
    assert.equal(await editor.page.getByRole('navigation', { name: 'Quick access', exact: true }).count(), 0)
    assert.deepEqual(editor.errors, [])
  } finally { await browser.close() }
})

test('home failures do not report an empty or normal monitoring state and can be retried', { timeout: 90000 }, async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const { page, configuration, errors } = await home(browser, { failed: true })
    const dashboards = page.getByRole('region', { name: 'Your dashboards' })
    const alerts = page.getByRole('region', { name: 'Alerts needing attention' })
    await dashboards.getByText('Dashboards are unavailable', { exact: true }).waitFor()
    await alerts.getByText('Alert status is unavailable', { exact: true }).waitFor()
    assert.equal(await page.getByText('No alerts need attention', { exact: true }).count(), 0)
    configuration.failed = false
    await dashboards.getByRole('button', { name: 'Try again', exact: true }).click()
    await dashboards.getByText('Build your first sensor dashboard', { exact: true }).waitFor()
    await alerts.getByRole('button', { name: 'Try again', exact: true }).click()
    await alerts.getByText('No active alert rules', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('a single dashboard fills its row and empty activity remains compact', { timeout: 90000 }, async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const { page, errors } = await home(browser, { dashboards: [state.dashboard], alerts: [{ ...state.alert, evaluation: { state: 'error', value: null, time: new Date().toISOString() } }] })
    const dashboards = page.getByRole('region', { name: 'Your dashboards' })
    const link = dashboards.getByRole('link', { name: state.dashboard.name, exact: true })
    await link.waitFor()
    await page.getByRole('region', { name: 'Recent monitoring activity' }).getByText('No alert activity yet. Firing and recovery updates will appear here.', { exact: true }).waitFor()
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(100)
      const panelBounds = await dashboards.boundingBox()
      const rowBounds = await link.boundingBox()
      assert.ok(rowBounds.width >= panelBounds.width - 4, 'A single dashboard must use the full list width')
      const activityBounds = await page.getByRole('region', { name: 'Recent monitoring activity' }).boundingBox()
      assert.ok(activityBounds.height < 180, 'Empty activity must not reserve a large card')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.screenshot({ path: `/tmp/observed-home-single-${width}.png`, fullPage: true })
    }
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
