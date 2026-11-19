import { WorkspaceError } from '../../core/workspace-error'
import { panelOptionsSchema } from '#shared/domain/panel'

import type { DashboardDefinition } from '#shared/domain/dashboard'

import type { VariableResolutionInput } from '#shared/domain/variable'
import type { WorkspaceStore, DataSourceAccess, DashboardImporter } from '../../core/ports'
import { VariableResolver } from '../queries/variable-resolver'
import { DashboardDiagnostics } from './dashboard-diagnostics'

export class DashboardService {
  constructor(private readonly store: WorkspaceStore, private readonly dataSources: DataSourceAccess, private readonly importer: DashboardImporter) {}

  resolveVariables(input: VariableResolutionInput) {
    return new VariableResolver(query => this.dataSources.query(query), () => this.dataSources.listSources()).resolve(input)
  }

  diagnoseDashboard(dashboard: DashboardDefinition) {
    return new DashboardDiagnostics(query => this.dataSources.query(query), input => this.resolveVariables(input)).check(dashboard)
  }

  async repairDashboard(id: string, input: { dataSourceId: string | null, restorePanelOptions?: boolean }) {
    const current = await this.store.get<DashboardDefinition>('dashboards', id)
    const sources = await this.dataSources.listSources()
    const dataSourceId = input.dataSourceId ?? current.panels.find(panel => panel.dataSourceId)?.dataSourceId ?? (sources.length === 1 ? sources[0]!.id : null)
    if (!dataSourceId) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Choose the InfluxDB data source for this dashboard.' })
    if (!current.importMetadata?.sourceDocument) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Import a dashboard JSON file to restore its original configuration.' })
    const imported = await this.importDashboard({ dataSourceId, document: JSON.parse(current.importMetadata.sourceDocument) })
    const preserveLayout = !input.restorePanelOptions && (current.columns ?? 12) === (imported.dashboard.columns ?? 12) && Boolean(current.sections?.length) === Boolean(imported.dashboard.sections?.length)
    const panels = imported.dashboard.panels.map((panel) => {
      const previous = current.panels.find(item => item.title === panel.title)
      return previous
        ? { ...panel, id: previous.id, ...(preserveLayout ? { x: previous.x ?? panel.x, y: previous.y ?? panel.y, span: previous.span, height: previous.height ?? panel.height } : {}), options: panelOptionsSchema.parse({
            ...panel.options, ...(input.restorePanelOptions ? {} : previous.options),
            fieldUnits: { ...panel.options?.fieldUnits, ...(input.restorePanelOptions ? {} : previous.options?.fieldUnits) },
            rightAxisFields: [...new Set([...(panel.options?.rightAxisFields ?? []), ...(input.restorePanelOptions ? [] : previous.options?.rightAxisFields ?? [])])]
          }), dataSourceId: previous.dataSourceId ?? panel.dataSourceId }
        : panel
    })
    const repaired = { ...current, sections: preserveLayout ? current.sections : imported.dashboard.sections, revision: current.revision ?? 1, columns: imported.dashboard.columns, variables: imported.dashboard.variables, importMetadata: imported.dashboard.importMetadata, panels }
    return this.saveDashboard(repaired, id)
  }

  async saveDashboard(dashboard: DashboardDefinition, id?: string) {
    await this.dataSources.validateSources([...dashboard.panels.flatMap(panel => panel.dataSourceId ? [panel.dataSourceId] : []), ...(dashboard.variables ?? []).flatMap(variable => variable.dataSourceId ? [variable.dataSourceId] : [])])
    return id
      ? this.store.saveDashboard(id, dashboard)
      : this.store.create('dashboards', { ...dashboard, revision: 1 })
  }

  async importDashboard(input: { dataSourceId: string | null, document: unknown }) {
    const available = await this.dataSources.listSources()
    const selectedId = input.dataSourceId ?? (available.length === 1 ? available[0]!.id : null)
    const source = selectedId ? available.find(source => source.id === selectedId) : null
    if (selectedId && !source) throw new WorkspaceError({ statusCode: 422, statusMessage: 'Select an existing data source' })
    const result = this.importer.convert(input.document, source ?? null)
    const resolved = await this.resolveVariables({ variables: result.dashboard.variables ?? [], dataSourceId: source?.id ?? null, range: result.dashboard.range })
    result.dashboard.variables = resolved.variables
    result.warnings.push(...Object.values(resolved.errors))
    const existing = new Set((await this.dataSources.listSources()).map(item => item.id))
    return {
      ...result,
      dashboard: {
        ...result.dashboard,
        panels: result.dashboard.panels.map(panel => ({ ...panel, dataSourceId: source?.id ?? (panel.dataSourceId && existing.has(panel.dataSourceId) ? panel.dataSourceId : null) }))
      }
    }
  }

  list() { return this.store.list<DashboardDefinition>('dashboards') }
  get(id: string) { return this.store.get<DashboardDefinition>('dashboards', id) }
  delete(id: string) { return this.store.delete('dashboards', id) }
  async versions(id: string) {
    await this.get(id)
    return (await this.store.list<{ dashboardId: string, snapshot: DashboardDefinition }>('dashboardVersions')).filter(version => version.dashboardId === id).slice(0, 100)
  }

  folders() { return this.store.list<{ name: string }>('dashboardFolders') }
  async createFolder(input: { name: string }) {
    try {
      return await this.store.create('dashboardFolders', input)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new WorkspaceError({ statusCode: 409, statusMessage: 'A folder with this name already exists' })
      throw error
    }
  }

  async deleteFolder(id: string) {
    const folder = await this.store.get<{ name: string }>('dashboardFolders', id)
    if ((await this.list()).some(dashboard => dashboard.folder === folder.name)) throw new WorkspaceError({ statusCode: 409, statusMessage: 'Move dashboards out of this folder first' })
    return this.store.delete('dashboardFolders', id)
  }
}
