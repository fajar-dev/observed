import type { Dashboard, DashboardDefinition, DashboardDiagnostic } from '#shared/domain/dashboard'

export function createDashboardLibrary() {
  useSeoMeta({ title: 'Dashboards · AMTI Observe' })
  const { data: dashboards, error: loadError, status, refresh } = useDashboards()
  const { data: sources, error: sourcesError } = useDataSources()
  const { busy, perform, error } = useAsyncAction()
  const open = ref(false)
  const filter = ref('')
  const folder = ref('@all')
  const view = ref('list')
  const sort = ref('updated')
  const tag = ref('@all')
  const folderOpen = ref(false)
  const folderName = ref('')
  const removeOpen = ref(false)
  const selected = ref<Dashboard>()
  const { data: folders, refresh: refreshFolders } = useDashboardFolders()
  const allTags = computed(() => [...new Set(dashboards.value.flatMap(item => item.tags ?? []))].sort())
  const folderNames = computed(() => [...new Set([...folders.value.map(item => item.name), ...dashboards.value.flatMap(item => item.folder ? [item.folder] : [])])].sort())
  const route = useRoute()
  onMounted(() => {
    if (route.query.import) startImport()
  })
  const filtered = computed(() => {
    const list = dashboards.value.filter(item =>
      `${item.name} ${item.description} ${item.tags?.join(' ') ?? ''}`.toLowerCase().includes(filter.value.toLowerCase().trim())
      && (folder.value === '@all' || 'folder:' + (item.folder || 'General') === folder.value)
      && (tag.value === '@all' || item.tags?.some(itemTag => 'tag:' + itemTag === tag.value))
    )
    return [...list].sort((a, b) => sort.value === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt))
  })
  async function createFolder() {
    await perform(async () => {
      await apiRequest('dashboard-folders', { method: 'POST', body: { name: folderName.value } })
      folderOpen.value = false
      folderName.value = ''
      await refreshFolders()
    })
  }
  async function duplicate(item: Dashboard) {
    await perform(async () => {
      const saved = await apiRequest<Dashboard>('dashboards', { method: 'POST', body: { ...item, name: (item.name + ' copy').slice(0, 120) } })
      await refresh()
      await navigateTo('/dashboards/' + saved.id)
    })
  }
  async function remove() {
    if (!selected.value) return
    await perform(async () => {
      await apiRequest('dashboards/' + selected.value!.id, { method: 'DELETE' })
      removeOpen.value = false
      await refresh()
    })
  }
  function rowMenu(item: Dashboard) {
    return [
      { label: 'Open dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboards/' + item.id },
      { label: 'Duplicate', icon: 'i-lucide-copy', onSelect: () => duplicate(item) },
      { label: 'Export JSON', icon: 'i-lucide-download', onSelect: () => downloadFile(item.name + '.json', JSON.stringify(item, null, 2)) },
      { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => {
        selected.value = item
        error.value = ''
        removeOpen.value = true
      } }
    ]
  }
  const json = ref('')
  const dataSourceId = ref('@none')
  const diagnostics = ref<DashboardDiagnostic>()
  const checking = ref(false)
  const preview = ref<{ dashboard: DashboardDefinition, warnings: string[] }>()
  const sourceOptions = computed(() => [{ label: 'Map data sources later', value: '@none' }, ...sources.value.map(item => ({ label: item.name, value: item.id }))])
  function startImport() {
    preview.value = undefined
    diagnostics.value = undefined
    if (sources.value.length === 1) dataSourceId.value = sources.value[0]!.id
    error.value = ''
    open.value = true
  }
  async function readFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      error.value = 'Select a JSON file under 2 MB.'
      return
    }
    json.value = await file.text()
    preview.value = undefined
  }
  async function inspect() {
    preview.value = undefined
    await perform(async () => {
      let document: unknown
      try {
        document = JSON.parse(json.value)
      } catch {
        throw new Error('Enter valid dashboard JSON.')
      }
      preview.value = await apiRequest('dashboard-imports/preview', {
        method: 'POST',
        body: { dataSourceId: dataSourceId.value === '@none' ? null : dataSourceId.value, document }
      })
    })
  }
  async function checkImport() {
    if (!preview.value) return
    checking.value = true
    error.value = ''
    try {
      diagnostics.value = await apiRequest('dashboard-imports/check', { method: 'POST', body: preview.value.dashboard })
    } catch (failure) {
      error.value = apiErrorMessage(failure)
    } finally {
      checking.value = false
    }
  }
  async function importDashboard() {
    const dashboard = preview.value?.dashboard
    if (!dashboard) return
    await perform(async () => {
      const missing = dashboard.panels.filter(panel => panel.type !== 'text' && (!panel.dataSourceId || !panel.query.trim()))
      if (missing.length) throw new Error(`Configure a data source and query for ${missing.length} panel(s) before importing.`)
      const validation = await apiRequest<DashboardDiagnostic>('dashboard-imports/check', { method: 'POST', body: dashboard })
      diagnostics.value = validation
      if (Object.keys(validation.variables.errors).length) throw new Error(Object.values(validation.variables.errors).join(' '))
      const configured = validation.panels.filter(panel => panel.status !== 'ready' || panel.rows > 0)
      if (configured.length && configured.every(panel => panel.status === 'error' || panel.status === 'unconfigured')) {
        throw new Error('The dashboard queries could not run. Review the errors and data source mappings before importing.')
      }
      const saved = await apiRequest<{ id: string }>('dashboards', { method: 'POST', body: dashboard })
      open.value = false
      await refresh()
      await navigateTo(`/dashboards/${saved.id}?edit=1`)
    })
  }
  watch([json, dataSourceId], () => {
    preview.value = undefined
    diagnostics.value = undefined
  })
  return { dashboards, loadError, status, refresh, sources, sourcesError, busy, perform, error, open, filter, folder, view, sort, tag, folderOpen, folderName, removeOpen, selected, folders, refreshFolders, allTags, folderNames, route, filtered, createFolder, duplicate, remove, rowMenu, json, dataSourceId, diagnostics, checking, preview, sourceOptions, startImport, readFile, inspect, checkImport, importDashboard }
}

const context = createFeatureContext(createDashboardLibrary, 'DashboardLibrary')
export const provideDashboardLibrary = context.provide
export const useDashboardLibrary = context.use
