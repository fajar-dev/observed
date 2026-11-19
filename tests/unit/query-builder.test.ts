import { assertReadOnlyInfluxQl } from '~~/server/features/queries/domain/read-only-influxql'
import { variableSchema } from '#shared/domain/variable'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InfluxQueryBuilder } from '#shared/domain/query-builder'

const selection = { measurement: 'host"metrics', field: 'cpu', aggregation: 'mean', tags: [{ key: 'host', value: 'server\'one' }] }

test('Flux builder escapes identifiers as strings and keeps the requested time window', () => {
  const builder = new InfluxQueryBuilder('flux')
  const statement = builder.build(selection)
  assert.match(statement, /range\(start: v.timeRangeStart, stop: v.timeRangeStop\)/)
  assert.ok(statement.includes('r._measurement == "host\\"metrics"'))
  assert.ok(statement.includes('r["host"] == "server\'one"'))
  assert.match(statement, /aggregateWindow\(every: v.windowPeriod, fn: mean/)
  assert.match(builder.metadata('tag', 'host"metrics'), /schema.measurementTagKeys/)
})

test('InfluxQL builder quotes names and literals without replacing the time macros', () => {
  const builder = new InfluxQueryBuilder('influxql')
  const statement = builder.build(selection)
  assert.ok(statement.includes('FROM "host\\"metrics"'))
  assert.ok(statement.includes('"host" = \'server\\\'one\''))
  assert.match(statement, /WHERE \$timeFilter/)
  assert.match(statement, /GROUP BY time\(\$__interval\)/)
  assert.match(builder.build({ ...selection, aggregation: 'raw' }), /LIMIT 500$/)
  assert.equal(builder.build({ ...selection, field: '' }), '')
  assert.throws(() => builder.build({ ...selection, aggregation: 'arbitrary()' }), /supported aggregation/)
})

test('InfluxQL read-only checks distinguish executable tokens from quoted data', () => {
  for (const query of ['SELECT value FROM cpu', 'SHOW MEASUREMENTS', 'SELECT value FROM "INTO"', 'SELECT value FROM cpu WHERE host=\'a;INTO\'', 'SELECT value FROM cpu WHERE host =~ /INTO;/', '/* source */ SELECT value FROM cpu']) assert.doesNotThrow(() => assertReadOnlyInfluxQl(query))
  for (const query of ['DROP DATABASE cpu', 'SELECT value INTO backup FROM cpu', 'SELECT value FROM cpu; DROP DATABASE cpu', '/* unclosed', 'SELECT value FROM cpu WHERE host=\'unclosed']) assert.throws(() => assertReadOnlyInfluxQl(query))
})

test('reserved dashboard variables and unresolved prototype names are rejected', () => {
  for (const name of ['constructor', 'prototype', 'toString']) assert.equal(variableSchema.safeParse({ name, label: '', values: ['value'], current: 'value' }).success, false)
})
