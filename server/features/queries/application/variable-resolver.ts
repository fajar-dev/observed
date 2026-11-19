import type { DashboardVariable, VariableResolution, VariableResolutionInput, VariableValues } from '#shared/domain/variable'
import type { QueryRequest, QueryResponse } from '#shared/domain/query'
import type { DataSource } from '#shared/domain/data-source'
import { expandVariableValues, variableReferences, variableSelection } from '#shared/utils/dashboard-variables'

export function serviceErrorMessage(error: unknown) {
  const failure = error as { data?: { message?: string }, message?: string } | undefined
  return failure?.data?.message || failure?.message || 'Query could not be completed'
}

function valuesFromResult(result: QueryResponse) {
  const values = result.rows.flatMap((row) => {
    const preferred = ['_value', 'value', 'name', 'host'].find(key => row[key] !== undefined && row[key] !== null)
    const column = preferred ?? Object.keys(row).find(key => !['_time', 'time', '_measurement', '_field'].includes(key))
    const value = column ? row[column] : null
    return typeof value === 'string' || typeof value === 'number' ? [String(value)] : []
  })
  return [...new Set(values.filter(value => value.length > 0 && value.length <= 500))].sort().slice(0, 500)
}

export class VariableResolver {
  constructor(
    private readonly query: (input: QueryRequest) => Promise<QueryResponse>,
    private readonly sources: () => Promise<DataSource[]>
  ) {}

  async resolve(input: VariableResolutionInput): Promise<VariableResolution> {
    const sources = await this.sources()
    const definitions = new Map(input.variables.map(variable => [variable.name, { ...variable, values: [...variable.values] }]))
    const errors: Record<string, string> = {}
    const selections: VariableValues = {}
    const resolved = new Set<string>()
    const resolving = new Set<string>()

    const resolve = async (name: string): Promise<void> => {
      if (resolved.has(name)) return
      const variable = definitions.get(name)
      if (!variable) throw new Error(`Variable "${name}" has no definition.`)
      if (resolving.has(name)) throw new Error(`Circular variable dependency involving "${name}".`)
      resolving.add(name)
      try {
        if (variable.type === 'datasource') {
          variable.values = sources.map(source => source.id)
        } else if (variable.type === 'query') {
          if (!variable.query?.trim()) throw new Error(`Variable "${name}" needs a query.`)
          for (const reference of variableReferences(variable.query)) {
            await resolve(reference)
            if (errors[reference]) throw new Error(`Variable "${name}" depends on "${reference}": ${errors[reference]}`)
          }
          const datasource = [...definitions.values()].filter(item => item.type === 'datasource')
          if (datasource.length === 1) await resolve(datasource[0]!.name)
          const selectedSource = datasource.length === 1 ? selections[datasource[0]!.name] : undefined
          const dataSourceId = (typeof selectedSource === 'string' ? selectedSource : undefined) ?? variable.dataSourceId ?? input.dataSourceId
          if (!dataSourceId) throw new Error(`Select a data source for variable "${name}".`)
          const dependencies = expandVariableValues([...definitions.values()].filter(item => resolved.has(item.name)), selections)
          const result = await this.query({ dataSourceId, query: variable.query, range: input.range, from: input.from, to: input.to, variables: dependencies })
          variable.values = valuesFromResult(result)
          if (!variable.values.length) throw new Error(`Variable "${name}" returned no values in this time range.`)
          const source = sources.find(source => source.id === dataSourceId)
          if (/^\s*buckets\s*\(/.test(variable.query) && source && variable.values.includes(source.database) && (input.values?.[name] === undefined || !variable.values.includes(String(input.values[name])))) variable.current = source.database
        }
        const selected = variableSelection(variable, input.values?.[name])
        selections[name] = selected
        if (variable.type === 'query' && !variable.values.length) throw new Error(`No values available for "${name}".`)
        const first = Array.isArray(selected) ? selected[0] : selected
        variable.current = first ?? ''
      } catch (error) {
        errors[name] = serviceErrorMessage(error)
        selections[name] = variableSelection(variable, input.values?.[name])
      } finally {
        resolving.delete(name)
        resolved.add(name)
      }
    }

    for (const variable of input.variables) await resolve(variable.name)
    const variables: DashboardVariable[] = input.variables.map(variable => definitions.get(variable.name)!)
    return { variables, selections, values: expandVariableValues(variables, selections), errors }
  }
}
