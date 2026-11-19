import type { Ref } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import type { Dashboard, DashboardDefinition } from '#shared/domain/dashboard'
import type { DashboardVariable, VariableValues } from '#shared/domain/variable'
import type { QueryRequest } from '#shared/domain/query'
import { dashboardSchema } from '#shared/domain/dashboard'
import { allVariableValue, variableSelection } from '#shared/utils/dashboard-variables'

export function useDashboardTimeState(draft: Ref<DashboardDefinition>, ready: Ref<boolean>, editing: Ref<boolean>, isNew: boolean) {
  const route = useRoute()
  const router = useRouter()
  const range = ref<QueryRequest['range']>('1h')
  const from = ref<string>()
  const to = ref<string>()
  const variables = ref<VariableValues>({})
  const { loading: variablesLoading, errors: variableErrors, resolved: resolvedVariables, refresh: refreshVariables } = useDashboardVariables(draft, variables, range, from, to)
  const refreshKey = ref(0)
  const refreshOptions = [{ label: 'Refresh off', value: 0 }, { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '5m', value: 300 }]
  function selectVariable(variable: DashboardVariable, selection: string | string[]) {
    const previous = variables.value[variable.name]
    if (Array.isArray(selection) && selection.includes(allVariableValue)) {
      variables.value[variable.name] = Array.isArray(previous) && previous.includes(allVariableValue)
        ? selection.filter(value => value !== allVariableValue)
        : [allVariableValue]
      return
    }
    variables.value[variable.name] = selection
  }

  function hydrateTime(saved: Dashboard) {
    range.value = saved.range
    variables.value = Object.fromEntries((saved.variables ?? []).map((variable) => {
      const parameter = route.query['var-' + variable.name]
      const selected = Array.isArray(parameter) ? parameter.filter((value): value is string => typeof value === 'string') : typeof parameter === 'string' ? parameter : undefined
      return [variable.name, variableSelection(variable, selected)]
    }))
    const parsedRange = dashboardSchema.shape.range.safeParse(route.query.range)
    if (parsedRange.success) range.value = parsedRange.data
    if (typeof route.query.from === 'string' && typeof route.query.to === 'string' && Number.isFinite(Date.parse(route.query.from)) && Number.isFinite(Date.parse(route.query.to)) && Date.parse(route.query.from) < Date.parse(route.query.to)) {
      from.value = route.query.from
      to.value = route.query.to
    }
  }
  watch([range, from, to, variables], () => {
    if (!ready.value || isNew) return
    const query: LocationQueryRaw = { ...route.query, range: range.value }
    for (const key of Object.keys(query)) {
      if (key === 'from' || key === 'to' || key === 'edit' || key.startsWith('var-')) Reflect.deleteProperty(query, key)
    }
    if (from.value && to.value) {
      query.from = from.value
      query.to = to.value
    }
    for (const [key, value] of Object.entries(variables.value)) query['var-' + key] = value
    void router.replace({ path: route.path, query })
  }, { deep: true })
  watch(() => draft.value.refresh, (seconds, _previous, cleanup) => {
    if (!seconds) return
    const timer = setInterval(() => {
      if (!editing.value && document.visibilityState === 'visible') refreshKey.value++
    }, seconds * 1000)
    cleanup(() => clearInterval(timer))
  }, { immediate: true })

  return { range, from, to, variables, variablesLoading, variableErrors, resolvedVariables, refreshVariables, refreshKey, refreshOptions, selectVariable, hydrateTime }
}
