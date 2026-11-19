import type { DataSourceInput } from './data-source'
import { fluxString } from './query'

export interface QueryBuilderSelection {
  measurement: string
  field: string
  aggregation: string
  tags: { key: string, value: string }[]
}
const identifier = (value: string) => '"' + value.replace(/[\\"]/g, '\\$&') + '"'
const literal = (value: string) => '\'' + value.replace(/[\\']/g, '\\$&') + '\''
const aggregates = new Set(['mean', 'last', 'min', 'max', 'sum', 'count', 'raw'])

export class InfluxQueryBuilder {
  constructor(private readonly language: DataSourceInput['queryLanguage']) {}
  metadata(kind: 'measurement' | 'field' | 'tag', measurement = '') {
    if (this.language === 'influxql') return kind === 'measurement' ? 'SHOW MEASUREMENTS LIMIT 500' : `SHOW ${kind === 'field' ? 'FIELD' : 'TAG'} KEYS FROM ${identifier(measurement)} LIMIT 500`
    const selector = kind === 'measurement' ? 'measurements' : kind === 'field' ? 'measurementFieldKeys' : 'measurementTagKeys'
    return `import "influxdata/influxdb/schema"\nschema.${selector}(bucket: v.defaultBucket, ${kind === 'measurement' ? '' : `measurement: ${fluxString(measurement)}, `}start: v.timeRangeStart, stop: v.timeRangeStop) |> limit(n: 500)`
  }

  build(selection: QueryBuilderSelection) {
    if (!selection.measurement || !selection.field) return ''
    if (!aggregates.has(selection.aggregation)) throw new Error('Choose a supported aggregation')
    const tags = selection.tags.filter(tag => tag.key.trim() && tag.value.trim())
    if (this.language === 'flux') {
      const filter = [`r._measurement == ${fluxString(selection.measurement)}`, `r._field == ${fluxString(selection.field)}`, ...tags.map(tag => `r[${fluxString(tag.key)}] == ${fluxString(tag.value)}`)].join(' and ')
      return ['from(bucket: v.defaultBucket)', '  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)', `  |> filter(fn: (r) => ${filter})`, selection.aggregation === 'raw' ? '  |> limit(n: 500)' : `  |> aggregateWindow(every: v.windowPeriod, fn: ${selection.aggregation}, createEmpty: false)`].join('\n')
    }
    const column = identifier(selection.field)
    const expression = selection.aggregation === 'raw' ? column : `${selection.aggregation.toUpperCase()}(${column})`
    return `SELECT ${expression} FROM ${identifier(selection.measurement)} WHERE $timeFilter` + tags.map(tag => ` AND ${identifier(tag.key)} = ${literal(tag.value)}`).join('') + (selection.aggregation === 'raw' ? ' LIMIT 500' : ' GROUP BY time($__interval) fill(none)')
  }
}
