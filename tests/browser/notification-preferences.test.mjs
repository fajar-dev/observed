import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'

test('profile alert pop-ups persist while muted alerts still update the inbox', { timeout: 90000 }, async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    let user = { id: randomUUID(), name: 'Structural engineer', email: 'engineer@example.test', role: 'admin', enabled: true, hasPassword: false, realtimeAlertToasts: true }
    let failSave = false
    const events = []
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.route('**/api/observe/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const path = url.pathname.replace('/api/observe/', '')
      if (path === 'auth/notification-preferences') {
        if (failSave) return route.fulfill({ status: 503, json: { statusMessage: 'Unable to save notification preferences' } })
        user = { ...user, ...request.postDataJSON() }
        return route.fulfill({ json: user })
      }
      if (path === 'auth/profile') {
        user = { ...user, name: request.postDataJSON().name }
        return route.fulfill({ json: user })
      }
      const after = url.searchParams.get('after')
      const snapshot = { items: [...events].reverse(), unread: events.length, cursor: String(events.length), events: after === null ? [] : events.filter(item => BigInt(item.sequence) > BigInt(after)) }
      if (path === 'notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'event: notifications\ndata: ' + JSON.stringify(snapshot) + '\n\n' })
      const records = { 'auth/session': { user, canRefresh: false }, 'auth/config': { providers: [], setupRequired: false }, 'auth/providers': [], 'auth/sessions': [], 'notifications': snapshot }
      return route.fulfill({ json: records[path] ?? [] })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const popups = () => page.getByRole('switch', { name: 'Alert pop-ups', exact: true })
    const title = text => page.locator('[data-slot="title"]').filter({ hasText: text })
    const event = (name, state = 'firing') => events.push({ id: randomUUID(), sequence: String(events.length + 1), alertRuleId: randomUUID(), alertName: name, sourceName: 'Bridge sensors', state, value: 0.7, threshold: 0.5, operator: 'gt', occurredAt: new Date().toISOString(), readAt: null })
    await page.goto(baseUrl + '/profile')
    await popups().waitFor()
    assert.equal(await popups().getAttribute('aria-checked'), 'true')
    event('Initial pier tilt')
    await title('Firing · Initial pier tilt').waitFor({ timeout: 10000 })
    await popups().click()
    await page.waitForFunction(() => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'false')
    await title('Firing · Initial pier tilt').waitFor({ state: 'hidden' })
    event('Muted deck strain')
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await page.getByText('Muted deck strain', { exact: true }).waitFor({ timeout: 10000 })
    assert.equal(await title('Firing · Muted deck strain').count(), 0)
    const menu = page.getByRole('region', { name: 'Alert notifications' })
    assert.equal(await menu.getByText('Initial pier tilt', { exact: true }).count(), 1)
    await page.keyboard.press('Escape')
    await page.getByLabel('Name', { exact: true }).fill('Bridge engineer')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await title('Profile saved').waitFor()
    await page.reload()
    await popups().waitFor()
    assert.equal(await popups().getAttribute('aria-checked'), 'false')
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    failSave = true
    await popups().click()
    await title('Account action failed').waitFor()
    assert.equal(await popups().getAttribute('aria-checked'), 'false')
    failSave = false
    await popups().click()
    await page.waitForFunction(() => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'true')
    assert.equal(await title('Firing · Muted deck strain').count(), 0)
    event('Pier tilt recovered', 'recovered')
    await title('Recovered · Pier tilt recovered').waitFor({ timeout: 10000 })
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
