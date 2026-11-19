import type { DashboardVariable, VariableValues } from '#shared/domain/variable'

export const allVariableValue = '$__all'

export function variableSelection(variable: DashboardVariable, selected?: string | string[]): string | string[] {
  const choices = new Set(variable.values)
  if (variable.includeAll) choices.add(allVariableValue)
  const candidates = (Array.isArray(selected) ? selected : [selected ?? variable.current]).filter(value => typeof value === 'string' && (variable.type === 'textbox' || choices.has(value)))
  const fallback = choices.has(variable.current) ? variable.current : variable.values[0] ?? ''
  return variable.multi ? candidates.length ? candidates : fallback ? [fallback] : [] : candidates[0] ?? fallback
}

export function expandVariableValues(variables: DashboardVariable[], selected: VariableValues): VariableValues {
  return Object.fromEntries(variables.map((variable) => {
    const selection = variableSelection(variable, selected[variable.name])
    const value = selection === allVariableValue || (Array.isArray(selection) && selection.includes(allVariableValue))
      ? [...variable.values]
      : selection
    return [variable.name, value]
  }))
}

export function variableReferences(query: string) {
  return [...new Set([...query.matchAll(/\$\{([A-Za-z][A-Za-z0-9_]*)(?::[^}]+)?\}|\$([A-Za-z][A-Za-z0-9_]*)/g)].map(match => match[1] ?? match[2]!))]
}

export function panelDataSourceId(panel: { dataSourceId: string | null, dataSourceVariable?: string }, values?: VariableValues) {
  const selected = panel.dataSourceVariable ? values?.[panel.dataSourceVariable] : undefined
  return typeof selected === 'string' && selected ? selected : panel.dataSourceId
}
