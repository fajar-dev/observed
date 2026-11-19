import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('workspace pages, nine visualizations and panel editor fit their containers', async () => {
  const browser = await chromium.launch({ ...launchOptions })
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } })
    const original = { ...state.dashboard, name: 'Infrastructure overview', columns: 24, description: '', variables: [{ name: 'host', label: 'Host', type: 'custom', values: ['server-01', 'server-02'], current: 'server-01' }] }
    const now = Date.now(), from = now - 3600000, types = ['line', 'area', 'bar', 'pie', 'stat', 'gauge', 'bargauge', 'table', 'text']
    const options = { ...original.panels[0].options, unit: 'percent', min: 0, max: 100, legend: true, displayName: undefined, text: 'Notes for the operations team. '.repeat(50) }
    let sourceRequests = 0
    original.panels = types.map((type, index) => ({ ...original.panels[0], id: crypto.randomUUID(), title: ['Host CPU usage', 'Host memory usage', 'Incoming requests', 'Resource allocation', 'CPU utilization', 'Memory utilization', 'Storage pools', 'Host metrics', 'Operations notes'][index], type, x: index % 3 * 8, y: Math.floor(index / 3) * 8, span: 8, height: 8, options, query: 'fixture_' + type, additionalQueries: [] }))
    await context.route('**/api/observe/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', ''), body = route.request().postDataJSON()
      if (path === 'auth/session') return route.fulfill({ json: { user: { id: '32bb0196-d9cd-4cfa-9b78-7d09c21f0fdc', name: 'Admin', email: 'admin@example.test', role: 'admin', enabled: true, hasPassword: true, createdAt: new Date().toISOString(), lastSignInAt: null }, canRefresh: false } })
      if (path === 'data-sources') {
        sourceRequests++
        return route.fulfill({ json: [{ ...state.source, name: 'Production InfluxDB' }] })
      }
      if (path === 'dashboards') return route.fulfill({ json: [original] })
      if (path === 'dashboards/' + original.id) return route.fulfill({ json: original })
      if (path === 'dashboard-folders') return route.fulfill({ json: [{ id: crypto.randomUUID(), name: 'Infrastructure' }] })
      if (path === 'alert-rules') return route.fulfill({ json: [{ ...state.alert, name: 'Host CPU usage', summary: 'CPU usage is above the configured limit.', evaluation: { state: 'normal', value: 32, time: new Date().toISOString() } }] })
      if (path === 'telegram-destinations') return route.fulfill({ json: [state.first, state.second] })
      if (path === 'variables/resolve') return route.fulfill({ json: { variables: original.variables, selections: { host: 'server-01' }, values: { host: 'server-01' }, errors: {} } })
      if (path === 'queries') {
        const type = body.query.replace('fixture_', '')
        const rows = type === 'table' ? Array.from({ length: 600 }, (_, i) => ({ _time: new Date(now).toISOString(), host: 'server-with-long-hostname-' + i, description: 'A long table value '.repeat(15), cpu: i })) : Array.from({ length: 4 }, (_, series) => Array.from({ length: 40 }, (_, i) => ({ _time: new Date(from + i * 3600000 / 39).toISOString(), _field: 'cpu', host: 'production-server-' + series, _value: 10 + series * 12 + Math.sin(i) * 5 }))).flat()
        return route.fulfill({ json: { columns: Object.keys(rows[0]), rows, duration: 12, truncated: false, timeRange: { from: new Date(from).toISOString(), to: new Date(now).toISOString() } } })
      }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) errors.push(message.text())
    })
    page.setDefaultTimeout(30000)
    for (const path of ['/', '/dashboards', '/alerts', '/configuration']) {
      await page.goto(baseUrl + path, { waitUntil: 'load' })
      await page.locator('.workspace-content').waitFor()
      assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth + 1), 'Overflow ' + path)
      if (path === '/dashboards') assert.equal(await page.locator('.content-panel-body').evaluate(el => getComputedStyle(el).padding), '0px')
    }
    sourceRequests = 0
    await page.goto(baseUrl + '/dashboards/' + original.id, { waitUntil: 'load' })
    await page.waitForFunction(() => document.querySelectorAll('.chart-plot svg').length >= 4)
    assert.equal(sourceRequests, 1, 'Panel instances share one data-source collection request')
    for (const mode of ['light', 'dark']) {
      await page.evaluate((mode) => {
        document.documentElement.classList.toggle('dark', mode === 'dark')
        document.documentElement.classList.toggle('light', mode === 'light')
      }, mode)
      for (const width of [1600, 1024, 390]) {
        await page.setViewportSize({ width, height: 1100 })
        await page.waitForTimeout(400)
        assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth + 1), 'Dashboard overflow ' + width)
        const panels = await page.locator('.panel-body').evaluateAll(items => items.map(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight })))
        for (const panel of panels) {
          assert.ok(panel.scrollWidth <= panel.width + 1, JSON.stringify(panel))
          assert.ok(panel.scrollHeight <= panel.height + 1, JSON.stringify(panel))
        }
      }
    }
    await page.setViewportSize({ width: 1600, height: 1100 })
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Panel actions', exact: true }).first().click()
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
    await page.getByRole('dialog', { name: 'Edit panel', exact: true }).waitFor()
    await page.waitForTimeout(400)
    assert.deepEqual(errors, [])
    console.log('Content style passed: flush tables, module pages, dashboard variables, nine visualization bounds, desktop/tablet/mobile, light/dark, and panel editor. No JavaScript errors.')
  } finally { await browser.close() }
})
