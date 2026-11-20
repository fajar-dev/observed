import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { baseUrl } from './environment.mjs'

export async function exerciseSensorAlertFlow(browser) {
  let sensorValue = 0.28, queryCount = 0
  const influx = createServer((request, response) => {
    request.resume()
    request.on('end', () => {
      queryCount++
      response.writeHead(200, { 'Content-Type': 'text/csv' })
      response.end('#datatype,string,long,dateTime:RFC3339,double\n,result,table,_time,_value\n,,0,' + new Date().toISOString() + ',' + sensorValue + '\n')
    })
  })
  await new Promise(resolve => influx.listen(0, '127.0.0.1', resolve))
  let context, source, rule
  const name = 'Bridge pier tilt simulation ' + randomUUID().slice(0, 8)
  const evidence = []
  try {
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const api = async (path, data, method = 'POST') => {
      const response = await context.request.fetch(baseUrl + '/api/observe/' + path, { method, headers: { origin: baseUrl }, ...(data === undefined ? {} : { data }) })
      assert.ok(response.ok(), method + ' ' + path + ': ' + await response.text())
      const text = await response.text()
      return text ? JSON.parse(text) : undefined
    }
    await api('auth/sign-in', { email: 'notifications@example.test', password: 'notification-test-password' })
    source = await api('data-sources', { name: 'Simulated bridge tilt sensor ' + randomUUID().slice(0, 8), url: 'http://127.0.0.1:' + influx.address().port, queryLanguage: 'flux', organization: 'bridge-engineering', database: 'pier-sensors', secret: 'simulation-token' })
    rule = await api('alert-rules', { name, summary: 'Tilt sensor on pier P2. Review sustained movement against the configured 0.5° threshold.', severity: 'warning', dataSourceId: source.id, query: 'from(bucket: "pier-sensors") |> range(start: -5m) |> filter(fn: (r) => r._measurement == "tilt" and r._field == "angle") |> last()', range: '5m', enabled: true, interval: 30, pendingFor: 0, operator: 'gt', reducer: 'last', field: '_value', threshold: 0.5, telegramDestinationIds: [] })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseUrl + '/alerts')
    await page.getByRole('button', { name: 'Notifications', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await page.getByRole('region', { name: 'Alert notifications' }).waitFor()
    await page.waitForTimeout(700)
    const values = [0.28, 0.46, 0.63, 0.76, 0.34, 0.27]
    const expectedStates = ['normal', 'normal', 'firing', 'firing', 'normal', 'normal']
    for (let index = 0; index < values.length; index++) {
      sensorValue = values[index]
      const evaluation = await api('alert-rules/' + rule.id + '/evaluate')
      assert.equal(evaluation.state, expectedStates[index])
      assert.equal(evaluation.value, sensorValue)
      if (index === 2) {
        await page.getByText('Firing · ' + name, { exact: true }).waitFor({ timeout: 10000 })
        await page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) }).getByText('Firing', { exact: true }).waitFor()
        await page.screenshot({ path: '/tmp/observed-sensor-firing.png' })
      }
      if (index === 4) {
        await page.getByText('Recovered · ' + name, { exact: true }).waitFor({ timeout: 10000 })
        await page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) }).getByText('Normal', { exact: true }).waitFor()
        await page.screenshot({ path: '/tmp/observed-sensor-recovery.png' })
      }
      const inbox = await api('notifications', undefined, 'GET')
      const events = inbox.items.filter(item => item.alertRuleId === rule.id)
      assert.equal(events.length, index < 2 ? 0 : index < 4 ? 1 : 2)
      evidence.push({ tiltDegrees: sensorValue, thresholdDegrees: 0.5, state: evaluation.state, notificationCount: events.length })
    }
    const inbox = await api('notifications', undefined, 'GET')
    const events = inbox.items.filter(item => item.alertRuleId === rule.id)
    assert.deepEqual(events.map(item => item.state), ['recovered', 'firing'])
    assert.equal(queryCount, values.length)
    const entries = page.getByRole('region', { name: 'Alert notifications' }).getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
    await entries.first().waitFor()
    assert.equal(await entries.count(), 2)
    await entries.first().getByRole('button', { name: 'Mark as read', exact: true }).click()
    await entries.first().getByRole('button', { name: 'Mark as read', exact: true }).waitFor({ state: 'hidden' })
    const read = await api('notifications', undefined, 'GET')
    assert.equal(read.items.filter(item => item.alertRuleId === rule.id && item.readAt).length, 1)
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: true, sensor: 'Bridge pier P2 tilt', queryExecutions: queryCount, createdRuleWithoutTelegram: rule.telegramDestinationIds.length === 0, samples: evidence, firingToast: true, recoveryToast: true, readReceipt: true, screenshots: ['/tmp/observed-sensor-firing.png', '/tmp/observed-sensor-recovery.png'] }, null, 2))
  } finally {
    if (context) {
      for (const [resource, item] of [['alert-rules', rule], ['data-sources', source]]) {
        if (item) await context.request.delete(baseUrl + '/api/observe/' + resource + '/' + item.id, { headers: { origin: baseUrl } })
      }
    }
    await context?.close()
    await new Promise(resolve => influx.close(resolve))
  }
}
