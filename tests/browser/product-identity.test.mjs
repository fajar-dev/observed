import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

async function assertProductCopy(page) {
  const copy = await page.evaluate(() => [
    document.title,
    document.body.innerText,
    ...[...document.querySelectorAll('[aria-label],[placeholder],[title],meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')].flatMap(element => ['aria-label', 'placeholder', 'title', 'content'].map(attribute => element.getAttribute(attribute) || ''))
  ].join('\n'))
  assert.doesNotMatch(copy, /\bworkspace\b|\bObserve\b|AMTI Observe/i, page.url())
}

async function inspectDialog(page, name, trigger, dismiss = 'Cancel') {
  await trigger()
  const dialog = page.getByRole('dialog', { name, exact: true })
  await dialog.waitFor()
  await assertProductCopy(page)
  if (dismiss) await dialog.getByRole('button', { name: dismiss, exact: true }).click()
  else await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
}

test('Observed identity follows page navigation while preserving AMTI assets', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext()
    let signedIn = false
    await context.route('**/api/observe/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      if (path === 'auth/session') return route.fulfill({ json: { user: signedIn ? { id: state.source.id, name: 'Engineer', email: 'engineer@example.test', role: 'admin', enabled: true, hasPassword: true } : null, canRefresh: false } })
      if (path === 'auth/config') return route.fulfill({ json: { setupRequired: false, providers: [] } })
      if (path === 'telegram-destinations') return route.fulfill({ json: [state.first] })
      if (path === 'alert-rules') return route.fulfill({ json: [state.alert] })
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
    await assertProductCopy(page)
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
    for (const [path, title] of [['/', 'Overview'], ['/dashboards', 'Dashboards'], ['/dashboards/' + state.dashboard.id, state.dashboard.name], ['/alerts', 'Alerts'], ['/configuration', 'Configuration'], ['/users', 'Users'], ['/profile', 'Profile'], ['/configuration?section=telegram-destinations', 'Configuration'], ['/dashboards/new', 'New dashboard']]) {
      await page.goto(baseUrl + path)
      await page.waitForFunction(expected => document.title === expected, title + ' · Observed')
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), title + ' · Observed')
      assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /sensor|monitoring|Observed/i)
      const brand = page.getByRole('link', { name: 'Observed overview', exact: true })
      assert.equal(await brand.locator('img').first().getAttribute('src'), '/logo.png')
      assert.equal(await brand.locator('img').first().getAttribute('alt'), 'AMTI')
      assert.equal(await brand.locator('source').first().getAttribute('srcset'), '/logo-full.png')
      await assertProductCopy(page)
      if (path === '/dashboards') {
        await inspectDialog(page, 'Import dashboard', async () => {
          await page.getByRole('button', { name: 'New dashboard', exact: true }).click()
          await page.getByRole('menuitem', { name: 'Import JSON', exact: true }).click()
        }, null)
      } else if (path === '/dashboards/' + state.dashboard.id) {
        await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
        await inspectDialog(page, 'Edit panel', async () => {
          await page.getByRole('button', { name: 'Panel actions', exact: true }).first().click()
          await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
        }, 'Discard')
      } else if (path === '/alerts') {
        await inspectDialog(page, 'New alert rule', () => page.getByRole('button', { name: 'New alert rule', exact: true }).click())
        await inspectDialog(page, 'Edit alert rule', async () => {
          await page.getByRole('button', { name: 'Alert actions', exact: true }).first().click()
          await page.getByRole('menuitem', { name: 'Edit rule', exact: true }).click()
        })
      } else if (path === '/configuration') {
        await inspectDialog(page, 'Add data source', () => page.getByRole('button', { name: 'Add data source', exact: true }).click())
        await inspectDialog(page, 'Edit data source', async () => {
          await page.getByRole('button', { name: 'Data source actions', exact: true }).first().click()
          await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
        })
      } else if (path.includes('telegram-destinations')) {
        await inspectDialog(page, 'Add Telegram destination', () => page.getByRole('button', { name: 'Add destination', exact: true }).click())
        await inspectDialog(page, 'Edit Telegram destination', async () => {
          await page.getByRole('button', { name: 'Telegram destination actions', exact: true }).first().click()
          await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
        })
      } else if (path === '/users') {
        await inspectDialog(page, 'Add user', () => page.getByRole('button', { name: 'Add user', exact: true }).click())
      }
    }
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})

test('sign-in, provider errors and initial setup use Observed copy without retired terminology', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    for (const scenario of ['sign-in', 'provider-error', 'setup']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
      await context.route('**/api/observe/**', (route) => {
        const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
        if (path === 'auth/session') return route.fulfill({ json: { user: null, canRefresh: false } })
        if (path === 'auth/config') return route.fulfill({ json: { setupRequired: scenario === 'setup', providers: ['google', 'microsoft'] } })
        return route.fulfill({ status: 401, json: { statusMessage: 'Email or password is incorrect' } })
      })
      const page = await context.newPage()
      await page.goto(baseUrl + '/sign-in' + (scenario === 'provider-error' ? '?error=oauth' : ''))
      await page.getByRole('heading', { name: scenario === 'setup' ? 'Set up Observed' : 'Welcome back.', exact: true }).waitFor()
      await assertProductCopy(page)
      if (scenario === 'setup') assert.equal(await page.title(), 'Initial setup · Observed')
      else {
        assert.equal(await page.getByRole('link', { name: 'Continue with Google', exact: true }).getAttribute('href'), '/api/observe/auth/oauth/google')
        assert.equal(await page.getByRole('link', { name: 'Continue with Microsoft', exact: true }).getAttribute('href'), '/api/observe/auth/oauth/microsoft')
      }
      if (scenario === 'provider-error') await page.getByText('Provider sign-in could not be completed', { exact: true }).waitFor()
      if (scenario === 'sign-in') {
        await page.locator('input[name="email"]').fill('engineer@example.test')
        await page.locator('input[name="password"]').fill('incorrect-password')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await page.getByText('Email or password is incorrect', { exact: true }).waitFor()
      }
      await assertProductCopy(page)
      await context.close()
    }
  } finally { await browser.close() }
})
