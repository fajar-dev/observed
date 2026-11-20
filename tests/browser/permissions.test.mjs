import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import pg from 'pg'
import { chromium } from 'playwright-core'
import { baseUrl, launchOptions } from './environment.mjs'

const connection = process.env.PERMISSION_TEST_DATABASE_URL
const none = () => ({ dashboards: { scope: 'none', access: 'view', grants: [] }, alerts: { scope: 'none', access: 'view', grants: [] } })

test('shared data sources remain usable while resource permissions protect API, UI and notifications', { skip: !connection }, async () => {
  assert.ok(new URL(connection).pathname.endsWith('_test'))
  const pool = new pg.Pool({ connectionString: connection })
  const browser = await chromium.launch(launchOptions)
  let queries = 0
  const influx = createServer((request, response) => {
    request.resume()
    request.on('end', () => {
      queries++
      response.writeHead(200, { 'Content-Type': 'text/csv' })
      response.end('#datatype,string,long,dateTime:RFC3339,double\n,result,table,_time,_value\n,,0,' + new Date().toISOString() + ',0.28\n')
    })
  })
  await new Promise(resolve => influx.listen(0, '127.0.0.1', resolve))
  try {
    const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const request = async (context, path, method = 'GET', data) => context.request.fetch(baseUrl + '/api/observe/' + path, { method, headers: { origin: baseUrl }, ...(data === undefined ? {} : { data }) })
    const api = async (context, path, method = 'GET', data) => {
      const response = await request(context, path, method, data)
      assert.ok(response.ok(), path + ': ' + await response.text())
      const text = await response.text()
      return text ? JSON.parse(text) : undefined
    }
    const config = await api(admin, 'auth/config')
    await api(admin, 'auth/' + (config.setupRequired ? 'setup' : 'sign-in'), 'POST', { email: 'notifications@example.test', password: 'notification-test-password', ...(config.setupRequired ? { name: 'Access administrator' } : {}) })
    const source = await api(admin, 'data-sources', 'POST', { name: 'Bridge A ' + randomUUID(), url: 'http://127.0.0.1:' + influx.address().port, queryLanguage: 'flux', organization: 'sensors', database: 'bridge-a', secret: 'test-only-token' })
    const secondSource = await api(admin, 'data-sources', 'POST', { ...source, name: 'Shared building source ' + randomUUID(), database: 'building-b', secret: 'test-only-token' })
    const query = 'from(bucket: "bridge-a") |> range(start: -1h)'
    const secondQuery = 'from(bucket: "private-sensors") |> range(start: -1h)'
    const panel = { id: randomUUID(), title: 'Pier tilt', type: 'stat', span: 6, height: 6, query, dataSourceId: source.id, additionalQueries: [] }
    const dashboard = await api(admin, 'dashboards', 'POST', { name: 'Allowed bridge ' + randomUUID(), description: '', folder: 'Allowed bridge', range: '1h', refresh: 0, panels: [panel] })
    const privateDashboard = await api(admin, 'dashboards', 'POST', { ...dashboard, name: 'Private bridge ' + randomUUID(), folder: 'Private bridge', panels: [{ ...panel, id: randomUUID(), dataSourceId: secondSource.id, query: secondQuery }] })
    const rule = await api(admin, 'alert-rules', 'POST', { name: 'Allowed tilt ' + randomUUID(), dataSourceId: source.id, query, range: '1h', field: '_value', interval: 60, enabled: true, telegramDestinationIds: [], threshold: 0.5, operator: 'gt', reducer: 'last' })
    const privateRule = await api(admin, 'alert-rules', 'POST', { ...rule, name: 'Private tilt ' + randomUUID(), dataSourceId: secondSource.id, query: secondQuery })
    const createUser = role => api(admin, 'users', 'POST', { name: role + ' engineer ' + randomUUID(), email: randomUUID() + '@example.test', password: 'permission-test-password', role, enabled: true })
    const viewerUser = await createUser('viewer'), editorUser = await createUser('editor')
    const viewer = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const editor = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const login = (context, user) => api(context, 'auth/sign-in', 'POST', { email: user.email, password: 'permission-test-password' })
    await login(viewer, viewerUser)
    assert.deepEqual(await api(viewer, 'dashboards'), [], 'New accounts start without monitoring access')
    assert.equal((await request(viewer, 'dashboards/' + dashboard.id)).status(), 403)
    assert.deepEqual(await api(viewer, 'notifications'), { items: [], unread: 0, cursor: '0', events: [] })
    const anonymous = await browser.newContext()
    assert.equal((await request(anonymous, 'data-sources')).status(), 401)
    assert.equal((await request(anonymous, 'queries', 'POST', { dataSourceId: source.id, query, range: '1h' })).status(), 401)
    await anonymous.close()
    const accessibleSources = await api(viewer, 'data-sources')
    assert.deepEqual(accessibleSources.map(item => item.id).sort(), (await api(admin, 'data-sources')).map(item => item.id).sort())
    assert.ok(accessibleSources.every(item => !('secret' in item) && !('ciphertext' in item)))
    await api(viewer, 'queries', 'POST', { dataSourceId: secondSource.id, query: secondQuery, range: '1h' })
    const selected = none()
    selected.dashboards = { scope: 'selected', access: 'view', grants: [{ id: dashboard.id, access: 'view' }] }
    selected.alerts = { scope: 'selected', access: 'view', grants: [{ id: rule.id, access: 'view' }] }
    await api(admin, 'users/' + viewerUser.id + '/permissions', 'PUT', selected)
    assert.equal((await request(viewer, 'dashboards')).status(), 401, 'Permission changes revoke cached sessions')
    await login(viewer, viewerUser)
    assert.deepEqual((await api(viewer, 'dashboards')).map(item => item.id), [dashboard.id])
    assert.deepEqual((await api(viewer, 'alert-rules')).map(item => item.id), [rule.id])
    assert.ok((await api(viewer, 'data-sources')).some(item => item.id === secondSource.id))
    assert.deepEqual((await api(viewer, 'dashboard-folders')).map(item => item.name), ['Allowed bridge'])
    for (const [path, method, body] of [
      ['dashboards/' + privateDashboard.id, 'GET'],
      ['dashboards/' + privateDashboard.id + '/versions', 'GET'],
      ['dashboards/' + privateDashboard.id + '/diagnostics', 'POST', {}],
      ['dashboards/' + dashboard.id, 'PUT', dashboard],
      ['alert-rules/' + privateRule.id + '/evaluate', 'POST', {}],
      ['users/' + viewerUser.id + '/permissions', 'PUT', selected],
      ['data-sources/' + source.id, 'PUT', { ...source, name: 'Forbidden connection edit' }],
      ['data-sources/' + source.id + '/test', 'POST', {}]
    ]) assert.equal((await request(viewer, path, method, body)).status(), 403, path)
    await api(viewer, 'variables/resolve', 'POST', { dataSourceId: secondSource.id, range: '1h', variables: [{ name: 'sensor', label: 'Sensor', type: 'query', values: [], current: '', query: secondQuery }] })
    const before = queries
    const result = await api(viewer, 'queries', 'POST', { dataSourceId: source.id, query, range: '1h' })
    assert.equal(result.rows[0]._value, 0.28)
    assert.equal(queries, before + 1)
    const event = async (alert, name) => {
      const id = randomUUID(), payload = { alertRuleId: alert.id, alertName: name, sourceName: 'Bridge sensors', state: 'firing', value: 0.7, threshold: 0.5, operator: 'gt', occurredAt: new Date().toISOString() }
      await pool.query('INSERT INTO observe.alert_notifications(id,alert_rule_id,occurred_at,payload) VALUES($1,$2,now(),$3)', [id, alert.id, JSON.stringify(payload)])
      return id
    }
    const allowedEvent = await event(rule, rule.name), hiddenEvent = await event(privateRule, privateRule.name)
    const inbox = await api(viewer, 'notifications')
    assert.deepEqual(inbox.items.map(item => item.id), [allowedEvent])
    assert.equal(inbox.unread, 1)
    assert.equal((await request(viewer, 'notifications/read', 'POST', { id: hiddenEvent })).status(), 404)
    await api(viewer, 'notifications/read', 'POST', { through: inbox.cursor })
    assert.equal((await api(viewer, 'notifications')).unread, 0)
    const page = await viewer.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseUrl + '/dashboards/' + privateDashboard.id)
    await page.getByText('403', { exact: true }).waitFor()
    assert.equal((await page.locator('body').innerText()).includes(privateDashboard.name), false)
    await page.goto(baseUrl + '/dashboards/' + dashboard.id + '?edit=1')
    await page.getByRole('button', { name: 'Notifications', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Edit dashboard', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await page.getByText(rule.name, { exact: true }).waitFor()
    assert.equal(await page.getByText(privateRule.name, { exact: true }).count(), 0)
    await page.keyboard.press('Escape')
    await event(privateRule, 'PRIVATE LIVE EVENT')
    await event(rule, 'Allowed live event')
    await page.getByText('Firing · Allowed live event', { exact: true }).waitFor({ timeout: 10000 })
    assert.equal(await page.getByText('Firing · PRIVATE LIVE EVENT', { exact: true }).count(), 0)
    // A new Editor can create immediately without seeing any existing resources.
    await login(editor, editorUser)
    assert.deepEqual(await api(editor, 'dashboards'), [])
    const creatorPage = await editor.newPage()
    await creatorPage.goto(baseUrl + '/dashboards/new')
    await creatorPage.getByRole('button', { name: 'Save dashboard', exact: true }).click()
    await creatorPage.waitForURL(url => /^\/dashboards\/[a-f0-9-]+$/.test(url.pathname))
    await creatorPage.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    await creatorPage.getByRole('button', { name: 'Notifications', exact: true }).click()
    await creatorPage.getByText('No notifications yet.', { exact: false }).waitFor()
    await creatorPage.keyboard.press('Escape')
    const uiCreatedId = new URL(creatorPage.url()).pathname.split('/').pop()
    await creatorPage.close()
    await api(editor, 'dashboards/' + uiCreatedId, 'DELETE')
    const own = await api(editor, 'dashboards', 'POST', { name: 'My bridge dashboard', description: '', range: '1h', refresh: 0, panels: [] })
    assert.equal(own.createdBy, editorUser.id)
    await api(editor, 'dashboards/' + own.id, 'PUT', { ...own, name: 'My bridge dashboard edited' })
    assert.equal((await request(editor, 'dashboards/' + dashboard.id)).status(), 403)
    const ownWithSensors = await api(editor, 'dashboards', 'POST', { ...dashboard, name: 'Editor bridge with shared sensors' })
    await api(editor, 'dashboards/' + ownWithSensors.id)
    await api(editor, 'dashboards/' + ownWithSensors.id, 'DELETE')
    const ownAlert = await api(editor, 'alert-rules', 'POST', { ...rule, name: 'Editor shared sensor alert' })
    await api(editor, 'alert-rules/' + ownAlert.id, 'DELETE')
    await api(editor, 'dashboards/' + own.id, 'DELETE')
    const editorPolicy = none()
    editorPolicy.dashboards = { scope: 'selected', access: 'view', grants: [{ id: dashboard.id, access: 'edit' }, { id: privateDashboard.id, access: 'view' }] }
    editorPolicy.alerts = { scope: 'selected', access: 'view', grants: [{ id: rule.id, access: 'edit' }] }
    await api(admin, 'users/' + editorUser.id + '/permissions', 'PUT', editorPolicy)
    await login(editor, editorUser)
    const saved = await api(editor, 'dashboards/' + dashboard.id, 'PUT', { ...dashboard, name: dashboard.name + ' edited' })
    await api(editor, 'alert-rules/' + rule.id, 'PUT', { ...rule, threshold: 0.6, dataSourceId: secondSource.id, query: secondQuery })
    await api(editor, 'queries', 'POST', { dataSourceId: secondSource.id, query: 'new sensor query', range: '1h' })
    await api(editor, 'dashboards/' + dashboard.id, 'PUT', { ...saved, panels: [{ ...panel, dataSourceId: secondSource.id, query: secondQuery }] })
    assert.equal((await request(editor, 'dashboards/' + privateDashboard.id, 'PUT', privateDashboard)).status(), 403)
    const created = await api(editor, 'dashboards', 'POST', { ...dashboard, name: 'Editor-created bridge' })
    assert.equal(created.createdBy, editorUser.id)
    await api(editor, 'dashboards/' + created.id)
    const createdAlert = await api(editor, 'alert-rules', 'POST', { ...rule, name: 'Editor-created tilt' })
    await api(editor, 'alert-rules/' + createdAlert.id)
    await api(editor, 'queries', 'POST', { dataSourceId: source.id, query: 'new authorized sensor query', range: '1h' })
    assert.equal((await request(editor, 'dashboards/' + dashboard.id, 'DELETE')).status(), 403, 'Edit access cannot delete another user’s resource')
    assert.equal((await request(editor, 'alert-rules/' + rule.id, 'DELETE')).status(), 403)
    await api(editor, 'alert-rules/' + createdAlert.id, 'DELETE')
    await api(editor, 'dashboards/' + created.id, 'DELETE')
    await api(editor, 'queries', 'POST', { dataSourceId: secondSource.id, query: 'arbitrary sensor query', range: '1h' })
    const beforeImport = queries
    const checked = await api(editor, 'dashboard-imports/check', 'POST', privateDashboard)
    assert.ok(checked.panels.every(panel => panel.status === 'ready'))
    await api(editor, 'dashboard-imports/preview', 'POST', { dataSourceId: secondSource.id, document: privateDashboard })
    assert.ok(queries > beforeImport, 'Import diagnostics can query any shared source without a grant')
    assert.ok((await api(editor, 'notifications')).items.every(item => item.alertRuleId === rule.id), 'Editor alert grants automatically filter the inbox')
    const editorPage = await editor.newPage()
    await editorPage.goto(baseUrl + '/dashboards/' + dashboard.id)
    await editorPage.getByRole('button', { name: 'Edit dashboard', exact: true }).waitFor()
    await editorPage.getByRole('button', { name: 'Notifications', exact: true }).waitFor()
    await editorPage.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await editorPage.getByRole('button', { name: 'Panel actions', exact: true }).first().click()
    await editorPage.getByRole('menuitem', { name: 'Edit', exact: true }).click()
    const panelEditor = editorPage.getByRole('dialog', { name: 'Edit panel', exact: true })
    assert.equal(await panelEditor.getByRole('textbox', { name: 'Query', exact: true }).evaluate(element => element.readOnly), false)
    await panelEditor.getByRole('combobox', { name: 'Panel data source', exact: true }).click()
    await editorPage.getByRole('option', { name: source.name, exact: true }).waitFor()
    await editorPage.getByRole('option', { name: secondSource.name, exact: true }).waitFor()
    await editorPage.keyboard.press('Escape')
    await panelEditor.getByRole('button', { name: 'Discard', exact: true }).click()
    const adminPage = await admin.newPage()
    await adminPage.goto(baseUrl + '/users')
    const userRow = adminPage.getByRole('row').filter({ hasText: viewerUser.email })
    await userRow.getByRole('button', { name: 'User actions', exact: true }).click()
    await adminPage.getByRole('menuitem', { name: 'Permissions', exact: true }).click()
    const permissionDialog = adminPage.getByRole('dialog', { name: 'User permissions', exact: true })
    await permissionDialog.waitFor()
    await permissionDialog.getByRole('combobox', { name: 'Alerts access', exact: true }).waitFor()
    assert.equal(await permissionDialog.getByRole('combobox', { name: 'Notifications access', exact: true }).count(), 0)
    await permissionDialog.getByText('Notifications follow alert access.', { exact: true }).waitFor()
    for (const width of [1440, 390]) {
      await adminPage.setViewportSize({ width, height: 1000 })
      await adminPage.waitForTimeout(150)
      const bounds = await permissionDialog.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, JSON.stringify(bounds))
      assert.ok(await permissionDialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1))
    }
    await adminPage.screenshot({ path: '/tmp/observed-permissions-editor.png' })
    await permissionDialog.getByRole('combobox', { name: 'Alerts access', exact: true }).click()
    await adminPage.getByRole('option', { name: 'No access', exact: true }).click()
    await permissionDialog.getByRole('button', { name: 'Save permissions', exact: true }).click()
    await permissionDialog.waitFor({ state: 'hidden' })
    assert.equal((await request(viewer, 'notifications')).status(), 401)
    await page.waitForURL(url => url.pathname === '/sign-in', { timeout: 15000 })
    await login(viewer, viewerUser)
    assert.deepEqual(await api(viewer, 'notifications'), { items: [], unread: 0, cursor: '0', events: [] })
    await page.reload()
    await page.getByRole('button', { name: 'Account menu', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await page.getByText('No notifications yet.', { exact: false }).waitFor()
    assert.equal((await api(viewer, 'notifications')).unread, 0)
    assert.equal((await request(viewer, 'notifications/read', 'POST', { id: allowedEvent })).status(), 404)
    await page.keyboard.press('Escape')
    await adminPage.setViewportSize({ width: 1440, height: 1000 })
    const editorRow = adminPage.getByRole('row').filter({ hasText: editorUser.email })
    await editorRow.getByRole('button', { name: 'User actions', exact: true }).click()
    await adminPage.getByRole('menuitem', { name: 'Permissions', exact: true }).click()
    await permissionDialog.getByRole('combobox', { name: 'Dashboards access', exact: true }).waitFor()
    assert.equal(await permissionDialog.getByRole('combobox', { name: 'Data source Query access', exact: true }).count(), 0)
    assert.equal(await permissionDialog.getByRole('button', { name: 'Select Query data sources', exact: true }).count(), 0)
    await permissionDialog.getByText('Saving signs this user out.', { exact: true }).waitFor()
    await adminPage.screenshot({ path: '/tmp/observed-shared-source-permissions.png' })
    assert.deepEqual(errors, [])
    console.log('Permissions passed: deny by default, scoped reads/edits, shared source querying, hidden notification filtering, user editor, mobile bounds and session revocation.')
  } finally {
    await browser.close()
    await pool.end()
    await new Promise(resolve => influx.close(resolve))
  }
})
