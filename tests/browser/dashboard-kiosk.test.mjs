import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('kiosk retains toolbar and filters, hides editing actions and exits from the toolbar', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const dashboard = { ...structuredClone(state.dashboard), refresh: 0, variables: [{ name: 'host', label: 'Host', type: 'custom', values: ['pve', 'backup'], current: 'pve' }], panels: [{ ...state.dashboard.panels[0], type: 'stat' }] }
    let queries = 0
    await context.route('**/api/observe/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      if (path === 'auth/session') return route.fulfill({ json: { user: { id: randomUUID(), name: 'Admin', email: 'admin@example.test', role: 'admin', enabled: true, hasPassword: true }, canRefresh: false } })
      if (path === 'data-sources') return route.fulfill({ json: [state.source] })
      if (path === 'dashboards') return route.fulfill({ json: [dashboard] })
      if (path === 'dashboards/' + dashboard.id) return route.fulfill({ json: dashboard })
      if (path === 'variables/resolve') {
        const values = { host: 'pve', ...route.request().postDataJSON().values }
        return route.fulfill({ json: { variables: dashboard.variables, selections: values, values, errors: {} } })
      }
      if (path === 'queries') {
        queries++
        return route.fulfill({ json: { columns: ['_time', '_value'], rows: [{ _time: new Date().toISOString(), _value: 42 }], duration: 1, truncated: false } })
      }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage(), issues = []
    page.on('pageerror', error => issues.push(error.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) issues.push(message.text())
    })
    await page.goto(baseUrl + '/dashboards/' + dashboard.id, { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Kiosk mode', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('kiosk') === '1')
    const toolbar = page.locator('.content-toolbar')
    await toolbar.getByRole('button', { name: 'Exit kiosk', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Edit dashboard', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Dashboard actions', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Panel actions', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Open navigation', exact: true }).count(), 0)
    assert.notEqual(await toolbar.getByRole('button', { name: 'Exit kiosk', exact: true }).evaluate(element => getComputedStyle(element).position), 'fixed')
    await toolbar.getByRole('combobox', { name: 'Auto refresh', exact: true }).waitFor()
    await toolbar.getByRole('button', { name: 'Time range', exact: true }).click()
    await page.getByRole('button', { name: 'Last 30 minutes', exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Last 30 minutes', exact: true }).waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).searchParams.get('kiosk'), '1', 'Dismiss the time picker before exiting kiosk')
    await toolbar.getByRole('combobox', { name: 'Auto refresh', exact: true }).click()
    await page.getByRole('option', { name: '5s', exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('option', { name: '5s', exact: true }).waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).searchParams.get('kiosk'), '1', 'Dismiss a selection menu before exiting kiosk')
    await page.getByRole('combobox', { name: 'Host', exact: true }).click()
    await page.getByRole('option', { name: 'backup', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('var-host') === 'backup')
    await toolbar.getByRole('button', { name: 'Time range', exact: true }).click()
    await page.getByRole('button', { name: 'Last 30 minutes', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('range') === '30m' && url.searchParams.get('kiosk') === '1')
    await page.locator('.metric-value').filter({ hasText: '42' }).waitFor()
    const before = queries
    const refreshed = page.waitForResponse(response => response.url().endsWith('/api/observe/queries'))
    await toolbar.getByRole('button', { name: 'Refresh panels', exact: true }).click()
    await refreshed
    assert.ok(queries > before)
    await page.reload({ waitUntil: 'load' })
    await toolbar.getByRole('button', { name: 'Exit kiosk', exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('var-host'), 'backup')
    assert.equal(new URL(page.url()).searchParams.get('range'), '30m')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.has('kiosk'), false)
    await page.getByRole('button', { name: 'Kiosk mode', exact: true }).click()
    await toolbar.getByRole('button', { name: 'Exit kiosk', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('var-host'), 'backup')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Kiosk mode', exact: true }).click()
    await toolbar.getByRole('button', { name: 'Exit kiosk', exact: true }).waitFor()
    assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= innerWidth + 1))
    await toolbar.getByRole('button', { name: 'Exit kiosk', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})
