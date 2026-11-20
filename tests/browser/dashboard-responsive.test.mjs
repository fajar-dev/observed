import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

async function fixture(context) {
  const first = randomUUID(), second = randomUUID()
  const panel = (title, x, y) => ({ ...structuredClone(state.dashboard.panels[0]), id: randomUUID(), title, type: 'stat', x, y, span: 6, height: 5 })
  const saved = {
    dashboard: { ...structuredClone(state.dashboard), name: 'Proxmox Cluster [Flux] with a longer dashboard title', description: 'Proxmox Dashboard complete written in Flux with cluster support and infrastructure metrics.', columns: 12, refresh: 0, variables: [], sections: [{ id: first, title: 'Hosts', y: 0 }, { id: second, title: 'Virtual machines', y: 6 }], panels: [panel('Host CPU', 0, 1), panel('Host memory', 6, 1), panel('VM CPU', 0, 7)] }
  }
  await context.route('**/api/observe/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
    if (path === 'auth/session') return route.fulfill({ json: { user: { id: randomUUID(), name: 'Admin', email: 'admin@example.test', role: 'admin', enabled: true, hasPassword: true }, canRefresh: false } })
    if (path === 'data-sources') return route.fulfill({ json: [state.source] })
    if (path === 'dashboards') return route.fulfill({ json: [saved.dashboard] })
    if (path === 'dashboards/' + saved.dashboard.id) {
      if (route.request().method() === 'PUT') saved.dashboard = { ...saved.dashboard, ...route.request().postDataJSON(), revision: saved.dashboard.revision + 1 }
      return route.fulfill({ json: saved.dashboard })
    }
    if (path === 'variables/resolve') return route.fulfill({ json: { variables: [], selections: {}, values: {}, errors: {} } })
    if (path === 'queries') return route.fulfill({ json: { columns: ['_time', '_value'], rows: [{ _time: new Date().toISOString(), _value: 42 }], duration: 1, truncated: false } })
    return route.fulfill({ json: [] })
  })
  return saved
}

function collectIssues(page) {
  const issues = []
  page.on('pageerror', error => issues.push(error.message))
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) issues.push(message.text())
  })
  return issues
}

test('toolbar controls remain visible across viewport sizes, modes and absolute time ranges', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext()
    const saved = await fixture(context)
    const page = await context.newPage(), issues = collectIssues(page)
    for (const width of [1920, 1440, 1280, 1024, 768, 430, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const absolute of [false, true]) {
        for (const mode of ['view', 'edit', 'kiosk']) {
          const params = new URLSearchParams()
          if (absolute) {
            params.set('from', '2026-11-19T00:00:00.000Z')
            params.set('to', '2026-11-20T00:00:00.000Z')
          }
          if (mode === 'kiosk') params.set('kiosk', '1')
          await page.goto(baseUrl + '/dashboards/' + saved.dashboard.id + '?' + params, { waitUntil: 'load' })
          await page.locator('.metric-value').first().waitFor()
          if (mode === 'edit') await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
          const clipped = await page.locator('.content-toolbar').evaluate(element => [...element.querySelectorAll('button,[role="combobox"]')].flatMap((button) => {
            const rect = button.getBoundingClientRect()
            return rect.width > 0 && (rect.left < 0 || rect.right > innerWidth + 1) ? [button.getAttribute('aria-label') || button.textContent] : []
          }))
          assert.deepEqual(clipped, [], JSON.stringify({ width, absolute, mode }))
          assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= innerWidth + 1))
          if (width >= 1024) {
            const aligned = await page.locator('.content-toolbar').evaluate(element => Math.abs(element.firstElementChild.getBoundingClientRect().top + element.firstElementChild.getBoundingClientRect().height / 2 - element.lastElementChild.getBoundingClientRect().top - element.lastElementChild.getBoundingClientRect().height / 2) < 2)
            assert.ok(aligned, 'Desktop toolbar stays on one row')
          }
        }
      }
    }
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})

test('touch editing can collapse, move and duplicate panels while preserving desktop dimensions', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const saved = await fixture(context)
    const page = await context.newPage(), issues = collectIssues(page)
    const first = saved.dashboard.sections[0].id, second = saved.dashboard.sections[1].id
    await page.goto(baseUrl + '/dashboards/' + saved.dashboard.id, { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).tap()
    await page.getByRole('button', { name: 'Collapse row Hosts', exact: true }).tap()
    await page.getByRole('button', { name: 'Expand row Hosts', exact: true }).tap()
    await page.getByRole('button', { name: 'Collapse row Virtual machines', exact: true }).tap()
    await page.locator(`[data-section-id="${first}"]`).getByRole('button', { name: 'Panel actions', exact: true }).first().tap()
    await page.getByRole('menuitem', { name: 'Move to row', exact: true }).tap()
    await page.getByRole('menuitem', { name: 'Virtual machines', exact: true }).tap()
    const target = page.locator(`[data-section-id="${second}"]`)
    await target.getByRole('heading', { name: 'Host CPU', exact: true }).waitFor()
    await target.getByRole('button', { name: 'Panel actions', exact: true }).last().tap()
    await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).tap()
    await target.getByRole('heading', { name: 'Host CPU copy', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).tap()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.equal(saved.dashboard.panels.length, 4)
    assert.ok(saved.dashboard.panels.every(panel => panel.span === 6 && panel.height === 5))
    await page.setViewportSize({ width: 1600, height: 1100 })
    await page.waitForTimeout(250)
    for (const panel of saved.dashboard.panels) {
      assert.equal(Number(await page.locator(`[data-panel-id="${panel.id}"]`).getAttribute('gs-w')), panel.span)
    }
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})
