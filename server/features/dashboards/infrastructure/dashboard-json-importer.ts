import { WorkspaceError } from '~~/server/domain/workspace-error'
import { randomUUID } from 'node:crypto'
import { dashboardSchema } from '#shared/domain/dashboard'
import { ranges } from '#shared/domain/query'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { Panel } from '#shared/domain/panel'
import type { DataSource } from '#shared/domain/data-source'
import type { DashboardVariable } from '#shared/domain/variable'
import { grafanaQuery } from '~~/server/features/dashboards/infrastructure/grafana-query'
import { compactEmptyRows } from '#shared/utils/grid-layout'
import { grafanaAppearance, grafanaCalculations as calculations, object, string } from '~~/server/features/dashboards/infrastructure/grafana-appearance'

const panelTypes: Record<string, Panel['type']> = {
  timeseries: 'line', graph: 'line', stat: 'stat', singlestat: 'stat', gauge: 'gauge',
  bargauge: 'bargauge', barchart: 'bar', histogram: 'bar', table: 'table', tableold: 'table', piechart: 'pie', text: 'text'
}

function flattenPanels(values: unknown[], depth = 0): Record<string, unknown>[] {
  if (depth > 12) return []
  return values.flatMap((value) => {
    const panel = object(value)
    if (panel.type === 'row') return flattenPanels(Array.isArray(panel.panels) ? panel.panels : [], depth + 1)
    return [panel]
  })
}

export class DashboardJsonImporter {
  convert(document: unknown, source: DataSource | null): { dashboard: DashboardDefinition, warnings: string[] } {
    const native = dashboardSchema.safeParse(document)
    if (native.success) {
      return { dashboard: native.data, warnings: [] }
    }

    const root = object(document)
    const model = object(root.dashboard ?? root.spec ?? root)
    if (!Array.isArray(model.panels) || !string(model.title)) {
      throw new WorkspaceError({ statusCode: 422, statusMessage: 'Expected a Classic Grafana dashboard with title and panels' })
    }

    const warnings: string[] = []
    const variables = object(model.templating).list
    const importedVariables: DashboardVariable[] = (Array.isArray(variables) ? variables.map(object) : []).flatMap((variable) => {
      const variableName = string(variable.name)
      if (!/^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(variableName) || variableName.startsWith('__')) return []
      const type = string(variable.type)
      if (!['custom', 'constant', 'query', 'datasource', 'textbox', 'interval'].includes(type)) {
        warnings.push(`Variable "${variableName}" uses an unsupported variable type "${type}".`)
        return []
      }
      const configured = Array.isArray(variable.options)
        ? variable.options.map(object).flatMap((option) => {
            const value = string(option.value)
            return value && value !== '$__all' ? [value] : []
          })
        : []
      const query = typeof variable.query === 'string' ? variable.query : string(object(variable.query).query) || string(variable.definition)
      const values = type === 'datasource' ? source ? [source.id] : [] : configured.length ? configured : ['custom', 'constant', 'interval'].includes(type) ? query.split(',').map(value => value.trim()).filter(Boolean).slice(0, 500) : []
      const selected = object(variable.current).value
      const first = Array.isArray(selected) ? string(selected[0]) : string(selected)
      return [{
        name: variableName, label: string(variable.label).slice(0, 80), values, current: type === 'datasource' ? source?.id ?? '' : first || values[0] || '',
        type: type as NonNullable<DashboardVariable['type']>, query: type === 'query' ? query : undefined,
        dataSourceId: type === 'query' ? source?.id ?? null : undefined,
        multi: variable.multi === true, includeAll: variable.includeAll === true, hidden: variable.hide === 2
      }]
    })
    const datasourceVariables = importedVariables.filter(variable => variable.type === 'datasource')
    const rowPanels: Record<string, unknown>[] = []
    function collectRows(values: unknown[], depth = 0) {
      if (depth > 12) return
      for (const value of values) {
        const row = object(value)
        if (row.type !== 'row') continue
        rowPanels.push(row)
        if (Array.isArray(row.panels)) collectRows(row.panels, depth + 1)
      }
    }
    collectRows(model.panels)
    const sections = rowPanels.slice(0, 100).map(row => ({ id: randomUUID(), title: string(row.title).slice(0, 120), y: Math.max(0, Math.floor(Number(object(row.gridPos).y) || 0)) }))
    const inputPanels = flattenPanels(model.panels)
    if (inputPanels.length > 100) warnings.push('Only the first 100 panels were imported.')
    const panels = inputPanels.slice(0, 100).map((item, index): Panel => {
      const title = (string(item.title).trim() || `Panel ${index + 1}`).slice(0, 120)
      const notes: string[] = []
      let type = Object.hasOwn(panelTypes, string(item.type)) ? panelTypes[string(item.type)]! : 'table'
      if (!Object.hasOwn(panelTypes, string(item.type))) notes.push(`Visualization "${string(item.type).slice(0, 80)}" was converted to a table.`)
      const targets = Array.isArray(item.targets) ? item.targets.map(object).filter(target => target.hide !== true) : []
      const convertedTargets = targets.flatMap((target) => {
        const datasource = object(target.datasource ?? item.datasource)
        const plugin = string(datasource.type)
        if (plugin && !['influxdb', 'mixed', 'datasource'].includes(plugin)) return []
        const query = grafanaQuery(target) ?? ''
        return query && query.length <= 25000 ? [{ query, alias: string(target.alias) }] : []
      })
      const queries = convertedTargets.map(target => target.query)
      if (!queries.length && type !== 'text') notes.push('Add a raw Flux or InfluxQL query for this panel.')
      if (queries.length < targets.length) notes.push('Some targets require manual conversion.')
      if (queries.length > 10) notes.push('Only the first 10 queries were imported.')

      const grid = object(item.gridPos)
      const width = Number(grid.w) || 24
      const options = grafanaAppearance(item, notes)
      options.queryAliases = Object.fromEntries(convertedTargets.map((target, index) => [String(index), target.alias]).filter(([, alias]) => alias))
      const custom = object(object(object(item.fieldConfig).defaults).custom)
      if (type === 'line' && (custom.drawStyle === 'bars' || item.bars === true)) type = 'bar'
      else if (type === 'line' && options.fill > 0) type = 'area'
      if (Array.isArray(object(object(item.fieldConfig).defaults).mappings) && (object(object(item.fieldConfig).defaults).mappings as unknown[]).length) notes.push('Value mappings require review.')
      for (const transformation of Array.isArray(item.transformations) ? item.transformations.map(object) : []) {
        const settings = object(transformation.options)
        if (transformation.id === 'organize') {
          options.hiddenFields = Object.entries(object(settings.excludeByName)).flatMap(([name, hidden]) => hidden === true ? [name] : [])
          options.renameFields = Object.fromEntries(Object.entries(object(settings.renameByName)).flatMap(([name, value]) => typeof value === 'string' ? [[name, value]] : []))
          options.fieldOrder = Object.entries(object(settings.indexByName)).sort((a, b) => Number(a[1]) - Number(b[1])).map(([name]) => options.renameFields[name] || name)
        } else if (transformation.id === 'reduce') {
          const reducer = Array.isArray(settings.reducers) ? string(settings.reducers[0]) : ''
          if (calculations[reducer]) options.reducer = calculations[reducer]!
          else notes.push('Review the imported reduction.')
        } else {
          notes.push(`Transformation "${string(transformation.id)}" requires review.`)
        }
      }
      if (notes.length) warnings.push(...notes.map(note => `${title}: ${note}`))
      const datasource = object(item.datasource)
      const datasourceName = string(datasource.uid).match(/\$\{([^}:]+)[^}]*\}/)?.[1] ?? string(item.datasource).replace(/^\$/, '')
      const dataSourceVariable = datasourceVariables.find(variable => variable.name === datasourceName)?.name ?? (datasourceVariables.length === 1 ? datasourceVariables[0]!.name : undefined)
      return {
        id: randomUUID(), title, type, span: Math.min(24, Math.max(1, Math.round(width))),
        x: Math.min(23, Math.max(0, Math.floor(Number(grid.x) || 0))), y: Math.max(0, Math.floor(Number(grid.y) || 0)), height: Math.max(2, Math.min(100, Math.ceil(Number(grid.h) || 8))), options,
        dataSourceId: source?.id ?? null, dataSourceVariable, queryLanguage: queries.length ? /^(?:SELECT|SHOW)\b/i.test(queries[0]!) ? 'influxql' : 'flux' : undefined, query: queries[0] ?? '', additionalQueries: queries.slice(1, 10),
        ...(notes.length ? { note: notes.join(' ') } : {})
      }
    })
    const positions = compactEmptyRows([...panels.map(panel => ({ x: panel.x ?? 0, y: panel.y ?? 0, w: panel.span, h: panel.height ?? 5 })), ...sections.map(section => ({ x: 0, y: section.y, w: 24, h: 1 }))])
    panels.forEach((panel, index) => {
      panel.y = positions[index]!.y
    })
    sections.forEach((section, index) => {
      section.y = positions[panels.length + index]!.y
    })
    const grafanaRange = string(object(model.time).from).replace(/^now-/, '')
    return {
      dashboard: {
        name: string(model.title).trim().slice(0, 120),
        description: string(model.description).slice(0, 1000),
        range: ranges.find(range => range.value === grafanaRange)?.value ?? '1h',
        refresh: 0,
        columns: 24,
        sections,
        tags: Array.isArray(model.tags) ? model.tags.flatMap(tag => typeof tag === 'string' && tag.trim() ? [tag.trim().slice(0, 40)] : []).slice(0, 20) : [],
        variables: importedVariables.slice(0, 20),
        importMetadata: { sourceDocument: JSON.stringify(document), warnings },
        panels
      },
      warnings
    }
  }
}
