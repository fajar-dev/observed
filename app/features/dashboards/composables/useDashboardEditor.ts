import { cloneValue } from '#shared/utils/clone'
import { dashboardSchema } from '#shared/domain/dashboard'
import { allVariableValue } from '#shared/utils/dashboard-variables'
import type { Dashboard, DashboardDefinition } from '#shared/domain/dashboard'

function createDashboardEditor() {
  const router = useRouter()
  const apiRequest = useApiRequest()
  const { canWrite } = useAuthentication()
  const route = useRoute()
  const { kiosk } = useDashboardKiosk()
  const id = String(route.params.id)
  const isNew = id === 'new'
  const { data: sources, error: sourcesError } = useDataSources()
  const { data: folders } = useDashboardFolders()
  const { refresh: refreshList } = useDashboards()
  const { busy, error, perform } = useAsyncAction()
  const toast = useNotifications()
  const draft = ref<DashboardDefinition>({ name: 'New dashboard', description: '', range: '1h', refresh: 0, panels: [], tags: [], variables: [], folder: '' })
  const original = shallowRef<Dashboard>()
  const ready = ref(isNew)
  const editing = ref(canWrite.value && !kiosk.value && (isNew || route.query.edit === '1'))
  const { panel, panelOpen, panelSession, newPanel, editPanel, finishPanelClose, applyPanel, duplicate, updateLayout } = useDashboardPanelEditing(draft, sources, editing)
  const sections = useDashboardSections(draft, editing)
  const { settings, settingsTab, tagText, jsonDocument, versionLoading, versions, settingsError, variableValues, variableTypes, openSettings, addVariable, updateVariable, exportDashboard, loadVersions, applyJson } = useDashboardSettings(draft, editing, id, isNew)
  const { range, from, to, variables, variablesLoading, variableErrors, resolvedVariables, refreshVariables, refreshKey, refreshOptions, selectVariable, hydrateTime } = useDashboardTimeState(draft, ready, editing, isNew)
  const healthOpen = ref(false)
  const removeOpen = ref(false)
  useBreadcrumbTitle(computed(() => ready.value ? draft.value.name : error.value ? 'Unavailable dashboard' : undefined))
  const dirty = computed(() => ready.value && (isNew ? draft.value.panels.length > 0 || draft.value.name !== 'New dashboard' : JSON.stringify(persistedDashboard(draft.value)) !== JSON.stringify(persistedDashboard(original.value!))))
  useSeoMeta({ title: () => `${draft.value.name} · AMTI Observe` })
  function persistedDashboard(value: DashboardDefinition) {
    return { ...value, variables: value.variables?.map(variable => ({
      ...variable, ...(variable.type === 'query' || variable.type === 'datasource' ? { values: [], current: '' } : {})
    })) }
  }
  function setDashboard(saved: Dashboard) {
    sections.collapsedRows.value = {}
    saved = { ...saved, revision: saved.revision ?? 1 }
    original.value = cloneValue(saved)
    draft.value = cloneValue(saved)
    hydrateTime(saved)
    ready.value = true
  }
  onMounted(async () => {
    if (!isNew) {
      await perform(async () => setDashboard(await apiRequest<Dashboard>('dashboards/' + id)))
      return
    }
  })
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
      if (isNew) await router.replace('/dashboards/' + saved.id)
    })
  }
  function discard() {
    if (dirty.value && !window.confirm('Discard unsaved dashboard changes?')) return
    if (isNew) {
      draft.value.panels = []
      draft.value.name = 'New dashboard'
      void router.push('/dashboards')
    } else if (original.value) setDashboard(original.value)
    editing.value = false
  }
  async function remove() {
    await perform(async () => {
      await apiRequest('dashboards/' + id, { method: 'DELETE' })
      removeOpen.value = false
      settings.value = false
      editing.value = false
      original.value = cloneValue({ ...draft.value, id, updatedAt: '' })
      await refreshList()
      await router.push('/dashboards')
    })
  }
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
  return { ...sections, route, id, isNew, sources, sourcesError, folders, refreshList, busy, error, perform, toast, draft, original, ready, editing, range, from, to, variables, variablesLoading, variableErrors, resolvedVariables, refreshVariables, healthOpen, refreshKey, panel, panelOpen, panelSession, finishPanelClose, settings, settingsTab, removeOpen, tagText, jsonDocument, versionLoading, versions, settingsError, dirty, refreshOptions, variableValues, variableTypes, persistedDashboard, selectVariable, setDashboard, newPanel, editPanel, applyPanel, duplicate, updateLayout, save, discard, openSettings, addVariable, updateVariable, exportDashboard, loadVersions, applyJson, remove, cloneValue, allVariableValue }
}

const context = createFeatureContext(createDashboardEditor, 'DashboardEditor')
export const provideDashboardEditor = context.provide
export const useDashboardEditor = context.use
