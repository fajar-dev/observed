import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('sidebar highlights the dashboard parent for detail, new, filtered and kiosk-exit routes', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.route('**/api/observe/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      if (path === 'auth/session') return route.fulfill({ json: { user: { id: randomUUID(), name: 'Admin', email: 'admin@example.test', role: 'admin', enabled: true, hasPassword: true }, canRefresh: false } })
      if (path === 'auth/config') return route.fulfill({ json: { setupRequired: false, providers: [] } })
      if (path === 'data-sources') return route.fulfill({ json: [state.source] })
      if (path === 'dashboards') return route.fulfill({ json: [state.dashboard] })
      if (path === 'dashboards/' + state.dashboard.id) return route.fulfill({ json: state.dashboard })
      if (path === 'variables/resolve') return route.fulfill({ json: { variables: [], values: {}, selections: {}, errors: {} } })
      if (path === 'queries') return route.fulfill({ json: { columns: ['_time', '_value'], rows: [{ _time: new Date().toISOString(), _value: 42 }], duration: 1, truncated: false } })
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage(), issues = []
    page.on('pageerror', error => issues.push(error.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) issues.push(message.text())
    })
    const cases = [
      ['/', '/'],
      ['/dashboards', '/dashboards'],
      ['/dashboards/' + state.dashboard.id, '/dashboards'],
      ['/dashboards/' + state.dashboard.id + '?range=30m', '/dashboards'],
      ['/dashboards/new', '/dashboards'],
      ['/alerts', '/alerts'],
      ['/configuration?section=telegram-destinations', '/configuration'],
      ['/users', '/users'],
      ['/profile', null]
    ]
    for (const [path, active] of cases) {
      await page.goto(baseUrl + path, { waitUntil: 'load' })
      const sidebar = page.locator('[id$="-sidebar-observe-navigation"]')
      await sidebar.waitFor()
      const current = await sidebar.locator('a[aria-current="page"]').evaluateAll(links => links.map(link => link.getAttribute('href')))
      assert.deepEqual(current, active ? [active] : [], path)
    }
    await page.goto(baseUrl + '/dashboards/' + state.dashboard.id + '?kiosk=1', { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Exit kiosk', exact: true }).click()
    await page.locator('[id$="-sidebar-observe-navigation"] a[href="/dashboards"][aria-current="page"]').waitFor()
    await page.locator('[id$="-sidebar-observe-navigation"] a[href="/alerts"]').click()
    await page.locator('[id$="-sidebar-observe-navigation"] a[href="/alerts"][aria-current="page"]').waitFor()
    assert.equal(await page.locator('[id$="-sidebar-observe-navigation"] a[href="/dashboards"]').getAttribute('aria-current'), null)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(baseUrl + '/dashboards/' + state.dashboard.id, { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
    const mobileNavigation = page.getByRole('dialog')
    await mobileNavigation.locator('a[href="/dashboards"][aria-current="page"]').waitFor()
    assert.equal(await mobileNavigation.locator('a[aria-current="page"]').count(), 1)
    await mobileNavigation.locator('a[href="/alerts"]').click()
    await page.waitForURL(url => url.pathname === '/alerts')
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
    await mobileNavigation.locator('a[href="/alerts"][aria-current="page"]').waitFor()
    assert.equal(await mobileNavigation.locator('a[href="/dashboards"]').getAttribute('aria-current'), null)
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})
