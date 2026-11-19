import { randomUUID } from 'node:crypto'

const source = { id: randomUUID(), name: 'Metrics', url: 'http://influx.example.test:8086', queryLanguage: 'flux', organization: 'test', database: 'metrics', hasSecret: true }
const first = { id: randomUUID(), name: 'Operations', chatId: '-10012345', hasToken: true }
const second = { ...first, id: randomUUID(), name: 'On call' }
const options = { unit: 'none', decimals: 2, color: '#356f9f', legend: true, fill: 15, lineWidth: 2, reducer: 'last', thresholds: [], hiddenFields: [], renameFields: {}, fieldOrder: [], fieldUnits: {}, rightAxisFields: [], text: '' }
const dashboard = { id: randomUUID(), name: 'Infrastructure', description: '', range: '1h', refresh: 0, revision: 1, folder: 'Infrastructure', tags: [], updatedAt: new Date().toISOString(), panels: [{ id: randomUUID(), title: 'CPU', type: 'line', span: 12, height: 8, dataSourceId: source.id, query: 'cpu', additionalQueries: [], options }] }
const alert = { id: randomUUID(), name: 'CPU usage', dataSourceId: source.id, query: 'cpu', range: '5m', enabled: true, interval: 60, threshold: 80, operator: 'gt', reducer: 'last', field: '', telegramDestinationIds: [first.id] }
export const state = { source, first, second, dashboard, alert }
