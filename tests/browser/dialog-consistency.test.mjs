import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('regular dialogs share compact spacing, borderless sections, subtle overlays and complete form prompts', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const editor = { id: crypto.randomUUID(), name: 'Bridge engineer', email: 'engineer.editor@example.test', role: 'editor', enabled: true }
    const admin = { id: crypto.randomUUID(), name: 'Engineer', email: 'engineer@example.test', role: 'admin', enabled: true, hasPassword: true }
    await context.route('**/api/observe/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      const records = {
        'auth/session': { user: admin, canRefresh: false },
        'auth/providers': [], 'auth/sessions': [],
        'data-sources': [state.source], 'telegram-destinations': [state.first],
        'dashboards': [state.dashboard], ['dashboards/' + state.dashboard.id]: state.dashboard,
        'dashboard-folders': [], 'alert-rules': [state.alert], 'users': [admin, editor],
        ['users/' + editor.id + '/permissions']: { dashboards: { scope: 'none', access: 'view', grants: [] }, alerts: { scope: 'none', access: 'view', grants: [] } },
        'notifications': { items: [], events: [], unread: 0, cursor: '0' },
        'queries': { rows: [], columns: [], duration: 0, truncated: false }
      }
      return route.fulfill({ json: records[path] ?? [] })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) errors.push(message.text())
    })
    async function inspect(name) {
      const dialog = page.getByRole('dialog', { name, exact: true })
      await dialog.waitFor()
      await page.waitForTimeout(250)
      assert.equal(await dialog.locator('[data-slot="description"]').count(), 0, name + ' subtitle')
      const edges = await dialog.locator(':scope > [data-slot]').evaluateAll(elements => elements.map((element) => {
        const style = getComputedStyle(element)
        return { slot: element.dataset.slot, top: style.borderTopStyle === 'none' ? 0 : parseFloat(style.borderTopWidth), bottom: style.borderBottomStyle === 'none' ? 0 : parseFloat(style.borderBottomWidth) }
      }))
      assert.ok(edges.every(edge => edge.top === 0 && edge.bottom === 0), JSON.stringify(edges))
      const overlay = page.locator('[data-slot="overlay"]').last()
      await overlay.waitFor()
      const effect = await overlay.evaluate(element => ({ blur: getComputedStyle(element).backdropFilter, tint: getComputedStyle(element).backgroundColor }))
      assert.match(effect.blur, /blur\(2px\)/)
      assert.match(effect.tint, /(?:\/|,)\s*0\.2\)/)
      const prompts = await dialog.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea').evaluateAll(elements => elements.map(element => ({ label: element.getAttribute('aria-label') || element.name || element.type, placeholder: element.getAttribute('placeholder'), height: element.getBoundingClientRect().height, tag: element.tagName, type: element.type })))
      assert.ok(prompts.every(field => field.placeholder?.trim()), JSON.stringify(prompts))
      assert.ok(prompts.filter(field => field.tag === 'INPUT' && field.type !== 'file').every(field => field.height === 36), JSON.stringify(prompts))
      const header = dialog.locator(':scope > [data-slot="header"]')
      const firstLabel = dialog.locator('label[data-slot="label"]').first()
      if (await firstLabel.count()) {
        const titleBounds = await header.locator('[data-slot="title"]').boundingBox()
        const labelBounds = await firstLabel.boundingBox()
        if (labelBounds && titleBounds) {
          if (!await dialog.getByRole('tablist').count()) assert.ok(labelBounds.y - titleBounds.y - titleBounds.height <= 24, name + ' title-to-field spacing')
          assert.equal(labelBounds.x, titleBounds.x, name + ' aligned title and fields')
        }
      }
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.waitForTimeout(120)
        const bounds = await dialog.boundingBox()
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, name + ' bounds')
        assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), name + ' overflow')
      }
      await page.setViewportSize({ width: 1440, height: 1000 })
      return dialog
    }
    for (const theme of ['light', 'dark']) {
      await page.goto(baseUrl + '/configuration')
      await page.evaluate((theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        document.documentElement.classList.toggle('light', theme === 'light')
      }, theme)
      await page.getByRole('button', { name: 'Add data source', exact: true }).click()
      let dialog = await inspect('Add data source')
      await dialog.getByRole('combobox', { name: 'Query language', exact: true }).click()
      await page.getByRole('option', { name: 'InfluxQL · Compatible API', exact: true }).click()
      await inspect('Add data source')
      await page.screenshot({ path: '/tmp/observed-data-source-dialog-' + theme + '.png' })
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
      await page.getByRole('tab', { name: 'Telegram destinations', exact: true }).click()
      await page.getByRole('button', { name: 'Add destination', exact: true }).click()
      dialog = await inspect('Add Telegram destination')
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    }
    await page.goto(baseUrl + '/users')
    await page.getByRole('button', { name: 'Add user', exact: true }).click()
    let dialog = await inspect('Add user')
    await page.screenshot({ path: '/tmp/observed-user-dialog.png' })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('row').filter({ hasText: editor.email }).getByRole('button', { name: 'User actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Permissions', exact: true }).click()
    dialog = await inspect('User permissions')
    assert.ok((await dialog.locator('[data-slot="body"]').innerText()).length < 180)
    await page.screenshot({ path: '/tmp/observed-permissions-compact.png' })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.goto(baseUrl + '/dashboards')
    await page.getByRole('button', { name: 'New folder', exact: true }).click()
    dialog = await inspect('New folder')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'New dashboard', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Import JSON', exact: true }).click()
    dialog = await inspect('Import dashboard')
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await page.goto(baseUrl + '/dashboards/' + state.dashboard.id + '?edit=1')
    await page.getByRole('button', { name: 'Dashboard actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Dashboard settings', exact: true }).click()
    dialog = await inspect('Dashboard settings')
    await page.screenshot({ path: '/tmp/observed-settings-drawer.png' })
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
