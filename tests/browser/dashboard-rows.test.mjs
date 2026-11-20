import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'
import { state } from './fixtures.mjs'

test('rows collapse, reorder and persist panel drag/resize without losing layout on mobile', async () => {
  const browser = await chromium.launch(launchOptions)
  try {
    const first = randomUUID(), second = randomUUID()
    let saved = { ...structuredClone(state.dashboard), columns: 12, refresh: 0, variables: [], sections: [{ id: first, title: 'Hosts', y: 0 }, { id: second, title: 'Virtual machines', y: 6 }], panels: [
      { ...structuredClone(state.dashboard.panels[0]), id: randomUUID(), title: 'Host CPU', type: 'stat', x: 0, y: 1, span: 6, height: 5 },
      { ...structuredClone(state.dashboard.panels[0]), id: randomUUID(), title: 'Host memory', type: 'stat', x: 6, y: 1, span: 6, height: 5 },
      { ...structuredClone(state.dashboard.panels[0]), id: randomUUID(), title: 'VM CPU', type: 'stat', x: 0, y: 7, span: 6, height: 5 }
    ] }
    const initial = structuredClone(saved), writes = [], issues = []
    let queryCount = 0
    const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } })
    await context.route('**/api/observe/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/observe/', '')
      if (path === 'auth/session') return route.fulfill({ json: { user: { id: randomUUID(), name: 'Admin', email: 'admin@example.test', role: 'admin', enabled: true, hasPassword: true }, canRefresh: false } })
      if (path === 'data-sources') return route.fulfill({ json: [state.source] })
      if (path === 'dashboards') return route.fulfill({ json: [saved] })
      if (path === 'dashboards/' + saved.id) {
        if (route.request().method() === 'PUT') {
          saved = { ...saved, ...route.request().postDataJSON(), revision: saved.revision + 1 }
          writes.push(structuredClone(saved))
        }
        return route.fulfill({ json: saved })
      }
      if (path === 'variables/resolve') return route.fulfill({ json: { variables: [], selections: {}, values: {}, errors: {} } })
      if (path === 'queries') {
        queryCount++
        return route.fulfill({ json: { columns: ['_time', '_value'], rows: [{ _time: new Date().toISOString(), _value: 42 }], duration: 1, truncated: false } })
      }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage()
    page.on('pageerror', error => issues.push(error.message))
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) issues.push(message.text())
    })
    const row = id => page.locator(`[data-section-id="${id}"]`)
    const panel = id => page.locator(`[data-panel-id="${id}"]`)
    await page.goto(baseUrl + '/dashboards/' + saved.id, { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Collapse row Hosts', exact: true }).click()
    await row(first).locator('.panel-surface').first().waitFor({ state: 'hidden' })
    assert.equal(await row(second).locator('.panel-surface').count(), 1)
    assert.equal(writes.length, 0, 'Viewer collapse must not persist or alter panel geometry')
    const beforeRefresh = queryCount
    const refreshed = page.waitForResponse(response => response.url().endsWith('/api/observe/queries'))
    await page.getByRole('button', { name: 'Refresh panels', exact: true }).click()
    await refreshed
    await page.waitForTimeout(100)
    assert.equal(queryCount, beforeRefresh + 1, 'Collapsed panels must not execute queries on refresh')
    await page.getByRole('button', { name: 'Expand row Hosts', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Expand row Hosts', exact: true }).click()
    await row(first).getByRole('heading', { name: 'Host CPU', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    const cpuId = initial.panels[0].id
    const drag = panel(cpuId).locator('.panel-drag-handle')
    const box = await drag.boundingBox()
    await page.mouse.move(box.x + 90, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 90, box.y + box.height / 2 + 130, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(250)
    assert.ok(Number(await panel(cpuId).getAttribute('gs-y')) > 0, 'Dragging must change row-local panel position')
    const handle = panel(cpuId).locator('.ui-resizable-se')
    await panel(cpuId).hover()
    const resize = await handle.boundingBox()
    await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2)
    await page.mouse.down()
    await page.mouse.move(resize.x + resize.width / 2 + 120, resize.y + resize.height / 2 + 65, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(250)
    assert.ok(Number(await panel(cpuId).getAttribute('gs-w')) > 6, 'Resize must change panel width')
    assert.ok(Number(await panel(cpuId).getAttribute('gs-h')) > 5, 'Resize must change panel height')
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    const geometry = saved.panels.find(panel => panel.id === cpuId)
    assert.ok(geometry.height > 5 && geometry.span > 6)
    assert.equal(geometry.sectionId, first)
    await page.reload({ waitUntil: 'load' })
    await panel(cpuId).waitFor()
    assert.equal(Number(await panel(cpuId).getAttribute('gs-w')), geometry.span)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(250)
    assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= innerWidth + 1))
    await page.setViewportSize({ width: 1600, height: 1100 })
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Row actions Virtual machines', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Move row up', exact: true }).click()
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    assert.equal(saved.sections[0].id, second)
    assert.equal(saved.panels.length, 3)
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Add row', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Add row', exact: true })
    await dialog.getByRole('textbox', { name: 'Row title', exact: false }).fill('Network')
    await dialog.getByRole('button', { name: 'Add row', exact: true }).click()
    await page.getByRole('button', { name: 'Collapse row Network', exact: true }).waitFor()
    await row(second).getByRole('button', { name: 'Panel actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Move to row', exact: true }).hover()
    await page.getByRole('menuitem', { name: 'Network', exact: true }).click()
    await page.locator('[data-section-id]').filter({ has: page.getByRole('button', { name: 'Collapse row Network', exact: true }) }).getByRole('heading', { name: 'VM CPU', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Row actions Network', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Rename row', exact: true }).click()
    const rename = page.getByRole('dialog', { name: 'Rename row', exact: true })
    await rename.getByRole('textbox', { name: 'Row title', exact: false }).fill('Network traffic')
    await rename.getByRole('button', { name: 'Save row', exact: true }).click()
    await page.getByRole('button', { name: 'Row actions Network traffic', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Remove row, keep panels', exact: true }).click()
    await page.locator('[data-section-id="ungrouped"]').getByRole('heading', { name: 'VM CPU', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Compact layout', exact: true }).click()
    await page.getByRole('button', { name: 'Collapse row Hosts', exact: true }).click()
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).click()
    await page.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    await page.reload({ waitUntil: 'load' })
    await page.getByRole('button', { name: 'Expand row Hosts', exact: true }).waitFor()
    assert.equal(saved.sections.length, 2)
    assert.equal(saved.panels.find(panel => panel.title === 'VM CPU').sectionId, null)
    assert.equal(saved.panels.find(panel => panel.id === cpuId).y, saved.sections.find(section => section.id === first).y + 1)
    assert.equal(saved.sections.find(section => section.id === first).collapsed, true)
    assert.deepEqual(issues, [])
  } finally { await browser.close() }
})
