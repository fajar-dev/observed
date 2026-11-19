import type { DashboardDiagnostic, DashboardDefinition, PanelDiagnostic } from '#shared/domain/dashboard'
import type { QueryRequest, QueryResponse } from '#shared/domain/query'
import type { VariableResolution, VariableResolutionInput } from '#shared/domain/variable'
import { panelDataSourceId } from '#shared/utils/dashboard-variables'
import { serviceErrorMessage } from '~~/server/features/queries/application/variable-resolver'

export class DashboardDiagnostics {
  constructor(
    private readonly query: (input: QueryRequest) => Promise<QueryResponse>,
    private readonly resolveVariables: (input: VariableResolutionInput) => Promise<VariableResolution>
  ) {}

  async check(dashboard: DashboardDefinition): Promise<DashboardDiagnostic> {
    const variables = await this.resolveVariables({
      variables: dashboard.variables ?? [], dataSourceId: dashboard.panels.find(panel => panel.dataSourceId)?.dataSourceId ?? null,
      range: dashboard.range
    })
    const panels: PanelDiagnostic[] = []
    const inspect = async (panel: DashboardDefinition['panels'][number]): Promise<PanelDiagnostic> => {
      if (panel.type === 'text') return { id: panel.id, title: panel.title, status: 'ready', rows: 0 }
      const dataSourceId = panelDataSourceId(panel, variables.values)
      if (!dataSourceId) return { id: panel.id, title: panel.title, status: 'unconfigured', rows: 0, message: 'Select an InfluxDB data source.' }
      const queries = [panel.query, ...panel.additionalQueries].filter(query => query.trim())
      if (!queries.length) return { id: panel.id, title: panel.title, status: 'unconfigured', rows: 0, message: 'This panel needs a supported query.' }
      let rows = 0
      try {
        for (const query of queries) {
          const result = await this.query({ dataSourceId, query, range: dashboard.range, variables: variables.values })
          rows += result.rows.length
        }
        return { id: panel.id, title: panel.title, status: rows ? 'ready' : 'empty', rows, ...(rows ? {} : { message: 'The query succeeded but returned no records. Check the time range and filters.' }) }
      } catch (error) {
        return { id: panel.id, title: panel.title, status: 'error', rows, message: serviceErrorMessage(error) }
      }
    }
    for (let offset = 0; offset < dashboard.panels.length; offset += 4) panels.push(...await Promise.all(dashboard.panels.slice(offset, offset + 4).map(inspect)))
    return { variables, panels }
  }
}
