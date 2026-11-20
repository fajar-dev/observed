import { WorkspaceError } from '~~/server/domain/workspace-error'
import { panelOptionsSchema } from '#shared/domain/panel'

import type { DashboardDefinition } from '#shared/domain/dashboard'

import type { VariableResolutionInput } from '#shared/domain/variable'
import type { WorkspaceRepository, DataSourceAccess, DashboardImporter, DashboardVariableResolver, DashboardChecker } from '~~/server/domain/ports'

export class DashboardService {
  constructor(private readonly repository: WorkspaceRepository, private readonly dataSources: DataSourceAccess, private readonly importer: DashboardImporter, private readonly variableResolver: DashboardVariableResolver, private readonly diagnostics: DashboardChecker) {}

  resolveVariables(input: VariableResolutionInput) {
    return this.variableResolver.resolve(input)
  }

  diagnoseDashboard(dashboard: DashboardDefinition) {
    return this.diagnostics.check(dashboard)
  }

  async repairDashboard(id: string, input: { dataSourceId: string | null, restorePanelOptions?: boolean }) {
    const current = await this.repository.get('dashboards', id)
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

  async saveDashboard(dashboard: DashboardDefinition, id?: string, creatorId?: string) {
    await this.dataSources.validateSources([...dashboard.panels.flatMap(panel => panel.dataSourceId ? [panel.dataSourceId] : []), ...(dashboard.variables ?? []).flatMap(variable => variable.dataSourceId ? [variable.dataSourceId] : [])])
    return id
      ? this.repository.saveDashboard(id, dashboard)
      : this.repository.create('dashboards', { ...dashboard, revision: 1 }, creatorId)
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

  get(id: string) { return this.repository.get('dashboards', id) }
  delete(id: string) { return this.repository.delete('dashboards', id) }
  async versions(id: string) {
    await this.get(id)
    return this.repository.versions(id)
  }

  folders() { return this.repository.list('dashboardFolders') }
  createFolder(input: { name: string }) { return this.repository.create('dashboardFolders', input) }

  async deleteFolder(id: string) {
    if (await this.repository.isReferenced('dashboardFolders', id)) throw new WorkspaceError({ statusCode: 409, statusMessage: 'Move dashboards and alert rules out of this folder first' })
    return this.repository.delete('dashboardFolders', id)
  }
}
