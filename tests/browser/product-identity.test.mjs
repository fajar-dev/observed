import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('Observed identity follows page navigation while preserving AMTI assets', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext()
    let signedIn = false
    await context.route('**/api/observe/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      if (path === 'auth/session') return route.fulfill({ json: { user: signedIn ? { id: state.source.id, name: 'Engineer', email: 'engineer@example.test', role: 'admin', enabled: true, hasPassword: true } : null, canRefresh: false } })
      if (path === 'auth/config') return route.fulfill({ json: { setupRequired: false, providers: [] } })
      if (path === 'data-sources') return route.fulfill({ json: [state.source] })
      if (path === 'dashboards') return route.fulfill({ json: [state.dashboard] })
      if (path === 'dashboards/' + state.dashboard.id) return route.fulfill({ json: state.dashboard })
      if (path === 'variables/resolve') return route.fulfill({ json: { variables: [], values: {}, selections: {}, errors: {} } })
      if (path === 'queries') return route.fulfill({ json: { columns: ['_time', '_value'], rows: [], duration: 1, truncated: false } })
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage(), issues = []
    page.on('pageerror', error => issues.push(error.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) issues.push(message.text())
    })
    await page.goto(baseUrl + '/sign-in')
    await page.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor()
    assert.equal(await page.title(), 'Sign in · Observed')
    assert.match(await page.locator('.auth-story').innerText(), /Structural Health Monitoring/i)
    assert.match(await page.locator('.auth-story').innerText(), /buildings, bridges/)
    assert.equal(await page.locator('meta[name="application-name"]').getAttribute('content'), 'Observed')
    assert.equal(await page.locator('meta[property="og:site_name"]').getAttribute('content'), 'Observed')
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow')
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/favicon.ico')
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), new URL('/logo-full.png', baseUrl).href)
    const manifest = await (await page.request.get(baseUrl + '/site.webmanifest')).json()
    assert.equal(manifest.name, 'Observed')
    assert.equal(manifest.short_name, 'Observed')
    for (const icon of manifest.icons) assert.equal((await page.request.get(baseUrl + icon.src)).status(), 200)
    assert.match(await (await page.request.get(baseUrl + '/robots.txt')).text(), /Disallow: \/\s/)

    signedIn = true
    for (const [path, title] of [['/', 'Overview'], ['/dashboards', 'Dashboards'], ['/dashboards/' + state.dashboard.id, state.dashboard.name], ['/alerts', 'Alerts'], ['/configuration', 'Configuration'], ['/users', 'Users'], ['/profile', 'Profile']]) {
      await page.goto(baseUrl + path)
      await page.waitForFunction(expected => document.title === expected, title + ' · Observed')
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), title + ' · Observed')
      assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /sensor|monitoring|Observed/i)
      const brand = page.getByRole('link', { name: 'Observed overview', exact: true })
      assert.equal(await brand.locator('img').first().getAttribute('src'), '/logo.png')
      assert.equal(await brand.locator('img').first().getAttribute('alt'), 'AMTI')
      assert.equal(await brand.locator('source').first().getAttribute('srcset'), '/logo-full.png')
      assert.doesNotMatch(await page.locator('body').innerText(), /AMTI Observe\b/)
    }
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})
