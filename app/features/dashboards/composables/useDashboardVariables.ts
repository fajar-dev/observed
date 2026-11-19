import type { Ref } from 'vue'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { QueryRequest } from '#shared/domain/query'
import type { VariableResolution, VariableValues } from '#shared/domain/variable'
import { expandVariableValues } from '#shared/utils/dashboard-variables'

export function useDashboardVariables(
  dashboard: Ref<DashboardDefinition>,
  selected: Ref<VariableValues>,
  range: Ref<QueryRequest['range']>,
  from: Ref<string | undefined>,
  to: Ref<string | undefined>
) {
  const loading = ref(false)
  const errors = ref<Record<string, string>>({})
  const resolved = computed(() => expandVariableValues(dashboard.value.variables ?? [], selected.value))
  let request = 0
  let lastInput = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  const configuration = () => ({
    variables: (dashboard.value.variables ?? []).map(variable => ({
      ...variable,
      values: variable.type === 'query' || variable.type === 'datasource' ? [] : variable.values,
      current: variable.type === 'query' || variable.type === 'datasource' ? '' : variable.current
    })),
    values: selected.value,
    dataSourceId: dashboard.value.panels.find(panel => panel.dataSourceId)?.dataSourceId ?? null,
    range: range.value, from: from.value, to: to.value
  })

  async function refresh() {
    const input = configuration()
    const key = JSON.stringify(input)
    if (key === lastInput) return
    if (!input.variables.length) {
      loading.value = false
      errors.value = {}
      lastInput = key
      return
    }
    const current = ++request
    loading.value = true
    try {
      const result = await apiRequest<VariableResolution>('variables/resolve', { method: 'POST', body: input })
      if (current !== request) return
      const byName = new Map(result.variables.map(variable => [variable.name, variable]))
      dashboard.value.variables = (dashboard.value.variables ?? []).map(variable => ({
        ...variable, values: byName.get(variable.name)?.values ?? variable.values
      }))
      selected.value = result.selections
      errors.value = result.errors
      lastInput = JSON.stringify(configuration())
    } catch (failure) {
      if (current === request) errors.value = { variables: apiErrorMessage(failure) }
    } finally {
      if (current === request) loading.value = false
    }
  }

  onMounted(() => {
    watch(() => JSON.stringify(configuration()), () => {
      if (JSON.stringify(configuration()) === lastInput) return
      request++
      if (configuration().variables.length) loading.value = true
      clearTimeout(timer)
      timer = setTimeout(refresh, 100)
    }, { immediate: true })
  })
  onBeforeUnmount(() => {
    request++
    clearTimeout(timer)
  })
  return { loading, errors, resolved, refresh: () => {
    lastInput = ''
    return refresh()
  } }
}
