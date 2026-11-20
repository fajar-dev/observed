import type { Dashboard } from '#shared/domain/dashboard'

function createDashboardLibrary() {
  const router = useRouter()
  const apiRequest = useApiRequest()
  const { canWrite } = useAuthentication()
  usePageSeo('Dashboards', 'Build and organize custom sensor dashboards for buildings, bridges, and other structures.')
  const { data: dashboards, error: loadError, status, refresh } = useDashboards()
  const { data: sources, error: sourcesError } = useDataSources()
  const { busy, perform, error } = useAsyncAction()
  const importer = useDashboardImport(sources, refresh)
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
    if (route.query.import && canWrite.value) importer.startImport()
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
      await router.push('/dashboards/' + saved.id)
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
    if (!canWrite.value) return [
      { label: 'Open dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboards/' + item.id },
      { label: 'Export JSON', icon: 'i-lucide-download', onSelect: () => downloadFile(item.name + '.json', JSON.stringify(item, null, 2)) }
    ]
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
  return { dashboards, loadError, status, refresh, sources, sourcesError, busy, perform, error, importer, filter, folder, view, sort, tag, folderOpen, folderName, removeOpen, selected, folders, refreshFolders, allTags, folderNames, route, filtered, createFolder, duplicate, remove, rowMenu, startImport: importer.startImport }
}

const context = createFeatureContext(createDashboardLibrary, 'DashboardLibrary')
export const provideDashboardLibrary = context.provide
export const useDashboardLibrary = context.use
