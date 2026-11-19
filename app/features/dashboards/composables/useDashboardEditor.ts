import type { LocationQueryRaw } from 'vue-router'
import { cloneValue } from '#shared/utils/clone'
import { dashboardSchema } from '#shared/domain/dashboard'
import { defaultPanelOptions } from '#shared/domain/panel'
import { allVariableValue, variableSelection } from '#shared/utils/dashboard-variables'
import type { Dashboard, DashboardDefinition } from '#shared/domain/dashboard'
import type { DashboardVariable, VariableValues } from '#shared/domain/variable'
import type { Panel } from '#shared/domain/panel'
import type { QueryRequest } from '#shared/domain/query'

export function createDashboardEditor() {
  const route = useRoute()
  const { kiosk } = useDashboardKiosk()
  const id = String(route.params.id)
  const isNew = id === 'new'
  const { data: sources, error: sourcesError } = useDataSources()
  const { data: folders } = useDashboardFolders()
  const { refresh: refreshList } = useDashboards()
  const { busy, error, perform } = useAsyncAction()
  const toast = useToast()
  const draft = ref<DashboardDefinition>({ name: 'New dashboard', description: '', range: '1h', refresh: 0, panels: [], tags: [], variables: [], folder: '' })
  const original = shallowRef<Dashboard>()
  const ready = ref(isNew)
  const editing = ref(!kiosk.value && (isNew || route.query.edit === '1'))
  const range = ref<QueryRequest['range']>('1h')
  const from = ref<string>()
  const to = ref<string>()
  const variables = ref<VariableValues>({})
  const { loading: variablesLoading, errors: variableErrors, resolved: resolvedVariables, refresh: refreshVariables } = useDashboardVariables(draft, variables, range, from, to)
  const healthOpen = ref(false)
  const refreshKey = ref(0)
  const panel = ref<Panel>()
  const panelOpen = ref(false)
  const panelSession = ref(0)
  const settings = ref(false)
  const settingsTab = ref('general')
  const removeOpen = ref(false)
  const tagText = ref('')
  const jsonDocument = ref('')
  const versionLoading = ref(false)
  const versions = ref<{ id: string, updatedAt: string, snapshot: DashboardDefinition }[]>([])
  const settingsError = ref('')
  useBreadcrumbTitle(computed(() => ready.value ? draft.value.name : error.value ? 'Unavailable dashboard' : undefined))
  const dirty = computed(() => ready.value && (isNew ? draft.value.panels.length > 0 || draft.value.name !== 'New dashboard' : JSON.stringify(persistedDashboard(draft.value)) !== JSON.stringify(persistedDashboard(original.value!))))
  const refreshOptions = [{ label: 'Refresh off', value: 0 }, { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '5m', value: 300 }]
  const variableValues = ref<Record<string, string>>({})
  const variableTypes = ['custom', 'query', 'datasource', 'constant', 'textbox', 'interval'] as const
  useSeoMeta({ title: () => `${draft.value.name} · AMTI Observe` })
  function persistedDashboard(value: DashboardDefinition) {
    return { ...value, variables: value.variables?.map(variable => ({
      ...variable, ...(variable.type === 'query' || variable.type === 'datasource' ? { values: [], current: '' } : {})
    })) }
  }
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
  function setDashboard(saved: Dashboard) {
    saved = { ...saved, revision: saved.revision ?? 1 }
    original.value = cloneValue(saved)
    draft.value = cloneValue(saved)
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
    ready.value = true
  }
  onMounted(async () => {
    if (!isNew) {
      await perform(async () => setDashboard(await apiRequest<Dashboard>('dashboards/' + id)))
      return
    }
  })
  function newPanel(): Panel {
    const y = Math.max(0, ...draft.value.panels.map(item => (item.y ?? 0) + (item.height ?? 5)))
    return { id: crypto.randomUUID(), title: 'New panel', type: 'line', span: (draft.value.columns ?? 12) / 2, dataSourceId: sources.value[0]?.id ?? null, query: '', additionalQueries: [], options: defaultPanelOptions(), x: 0, y: draft.value.panels.length ? y : 0, height: 5 }
  }
  function editPanel(item?: Panel) {
    panelSession.value++
    panel.value = cloneValue(item ?? newPanel())
    editing.value = true
    panelOpen.value = true
  }
  function finishPanelClose() {
    if (!panelOpen.value) panel.value = undefined
  }
  function applyPanel(updated: Panel) {
    const index = draft.value.panels.findIndex(item => item.id === updated.id)
    if (index < 0) draft.value.panels.push(updated)
    else draft.value.panels.splice(index, 1, updated)
    panelOpen.value = false
  }
  function duplicate(item: Panel) {
    const copy = cloneValue(item)
    draft.value.panels.push({ ...copy, id: crypto.randomUUID(), title: (item.title + ' copy').slice(0, 120), y: newPanel().y })
  }
  function updateLayout(changes: { id: string, x: number, y: number, span: number, height: number }[]) {
    for (const change of changes) {
      const current = draft.value.panels.find(item => item.id === change.id)
      if (current) Object.assign(current, { ...change, span: Math.min(draft.value.columns ?? 12, change.span) })
    }
  }
  async function save() {
    await perform(async () => {
      const parsed = dashboardSchema.safeParse(draft.value)
      if (!parsed.success) throw new Error(parsed.error.issues.map(issue => `${issue.path.join('.')} · ${issue.message}`).join('\n'))
      const saved = await apiRequest<Dashboard>(isNew ? 'dashboards' : 'dashboards/' + id, { method: isNew ? 'POST' : 'PUT', body: parsed.data })
      setDashboard(saved)
      editing.value = false
      settings.value = false
      toast.add({ title: 'Dashboard saved', color: 'success' })
      await refreshList()
      if (isNew) await navigateTo('/dashboards/' + saved.id, { replace: true })
    })
  }
  function discard() {
    if (dirty.value && !window.confirm('Discard unsaved dashboard changes?')) return
    if (isNew) {
      draft.value.panels = []
      draft.value.name = 'New dashboard'
      void navigateTo('/dashboards')
    } else if (original.value) setDashboard(original.value)
    editing.value = false
  }
  function openSettings() {
    editing.value = true
    tagText.value = (draft.value.tags ?? []).join(', ')
    variableValues.value = Object.fromEntries((draft.value.variables ?? []).map(variable => [variable.name, variable.values.join(', ')]))
    settingsError.value = ''
    settings.value = true
  }
  function addVariable() {
    draft.value.variables ??= []
    let index = 1
    while (draft.value.variables.some(item => item.name === 'variable' + index)) index++
    draft.value.variables.push({ name: 'variable' + index, label: '', values: ['value'], current: 'value' })
  }
  function updateVariable(variable: DashboardVariable, text: string) {
    variable.values = text.split(',').map(value => value.trim()).filter(Boolean).slice(0, 100)
    variable.current = variable.values.includes(variable.current) ? variable.current : variable.values[0] ?? ''
  }
  function exportDashboard() {
    downloadFile(draft.value.name.replace(/[^a-z0-9_-]+/gi, '-') + '.json', JSON.stringify(draft.value, null, 2))
  }
  async function loadVersions() {
    if (isNew) return
    versionLoading.value = true
    try {
      versions.value = await apiRequest('dashboards/' + id + '/versions')
    } catch (failure) {
      settingsError.value = apiErrorMessage(failure)
    } finally {
      versionLoading.value = false
    }
  }
  watch(settingsTab, (tab) => {
    if (tab === 'versions') void loadVersions()
    if (tab === 'json') jsonDocument.value = JSON.stringify(draft.value, null, 2)
  })
  function applyJson() {
    settingsError.value = ''
    try {
      const parsed = dashboardSchema.parse(JSON.parse(jsonDocument.value))
      draft.value = { ...parsed, revision: draft.value.revision }
      toast.add({ title: 'JSON applied to draft. Save to persist.' })
      settings.value = false
    } catch (failure) {
      settingsError.value = failure instanceof Error ? failure.message : 'Invalid dashboard JSON'
    }
  }
  async function remove() {
    await perform(async () => {
      await apiRequest('dashboards/' + id, { method: 'DELETE' })
      removeOpen.value = false
      settings.value = false
      editing.value = false
      original.value = cloneValue({ ...draft.value, id, updatedAt: '' })
      await refreshList()
      await navigateTo('/dashboards')
    })
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
    void navigateTo({ path: route.path, query }, { replace: true })
  }, { deep: true })
  watch(() => draft.value.refresh, (seconds, _previous, cleanup) => {
    if (!seconds) return
    const timer = setInterval(() => {
      if (!editing.value && document.visibilityState === 'visible') refreshKey.value++
    }, seconds * 1000)
    cleanup(() => clearInterval(timer))
  }, { immediate: true })
  onBeforeRouteLeave(() => !dirty.value || window.confirm('Leave with unsaved dashboard changes?'))
  onMounted(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.value) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', unload)
    onScopeDispose(() => window.removeEventListener('beforeunload', unload))
  })
  return { route, id, isNew, sources, sourcesError, folders, refreshList, busy, error, perform, toast, draft, original, ready, editing, range, from, to, variables, variablesLoading, variableErrors, resolvedVariables, refreshVariables, healthOpen, refreshKey, panel, panelOpen, panelSession, finishPanelClose, settings, settingsTab, removeOpen, tagText, jsonDocument, versionLoading, versions, settingsError, dirty, refreshOptions, variableValues, variableTypes, persistedDashboard, selectVariable, setDashboard, newPanel, editPanel, applyPanel, duplicate, updateLayout, save, discard, openSettings, addVariable, updateVariable, exportDashboard, loadVersions, applyJson, remove, cloneValue, allVariableValue }
}

const context = createFeatureContext(createDashboardEditor, 'DashboardEditor')
export const provideDashboardEditor = context.provide
export const useDashboardEditor = context.use
