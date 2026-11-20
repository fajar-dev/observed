import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('refresh presets schedule queries, Off cancels them, and Auto/day settings survive saves', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    let dashboard = { ...structuredClone(state.dashboard), refresh: 0, panels: [{ ...state.dashboard.panels[0], type: 'stat' }] }
    let queries = 0
    await context.route('**/api/observe/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      if (path === 'auth/session') return route.fulfill({ json: { user: { id: crypto.randomUUID(), name: 'Engineer', role: 'admin', enabled: true }, canRefresh: false } })
      if (path === 'dashboards') return route.fulfill({ json: [dashboard] })
      if (path === 'dashboards/' + dashboard.id) {
        if (route.request().method() === 'PUT') dashboard = { ...route.request().postDataJSON(), id: dashboard.id, revision: dashboard.revision + 1, updatedAt: new Date().toISOString() }
        return route.fulfill({ json: dashboard })
      }
      if (path === 'data-sources') return route.fulfill({ json: [state.source] })
      if (path === 'notifications') return route.fulfill({ json: { items: [], events: [], unread: 0, cursor: '0' } })
      if (path === 'queries') {
        queries++
        return route.fulfill({ json: { rows: [{ _value: 42 }], columns: ['_value'], duration: 1, truncated: false } })
      }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseUrl + '/dashboards/' + dashboard.id)
    await page.locator('.metric-value').filter({ hasText: '42' }).waitFor()
    const refresh = page.getByRole('combobox', { name: 'Auto refresh', exact: true })
    await refresh.click()
    assert.deepEqual(await page.getByRole('option').allTextContents(), ['Off', 'Auto', '5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'])
    const tick = page.waitForResponse(response => response.url().endsWith('/api/observe/queries'), { timeout: 10000 })
    await page.getByRole('option', { name: '5s', exact: true }).click()
    await tick
    assert.ok(queries >= 2, '5s must trigger a query refresh')
    await refresh.click()
    await page.getByRole('option', { name: 'Off', exact: true }).click()
    const stopped = queries
    await page.waitForTimeout(5500)
    assert.equal(queries, stopped, 'Off must clear the previous timer')
    await refresh.click()
    await page.getByRole('option', { name: 'Auto', exact: true }).click()
    await page.getByRole('button', { name: 'Time range', exact: true }).click()
    const rangeChanged = page.waitForResponse(response => response.url().endsWith('/api/observe/queries'))
    await page.getByRole('button', { name: 'Last 5 minutes', exact: true }).click()
    await rangeChanged
    const autoTick = page.waitForResponse(response => response.url().endsWith('/api/observe/queries'), { timeout: 10000 })
    await autoTick
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.equal(dashboard.refresh, 'auto')
    await refresh.click()
    await page.getByRole('option', { name: '1d', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.equal(dashboard.refresh, 86400)
    await page.reload()
    await refresh.filter({ hasText: '1d' }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
