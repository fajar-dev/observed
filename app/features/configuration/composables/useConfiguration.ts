import type { DataSource, DataSourceInput } from '#shared/domain/data-source'

function createConfiguration() {
  const router = useRouter()
  const apiRequest = useApiRequest()
  usePageSeo('Configuration', 'Connect InfluxDB sensor data and configure Telegram notification destinations in Observed.')
  const { data: sources, error: loadError, status, refresh } = useDataSources()
  const { busy, perform, error } = useAsyncAction()
  const toast = useNotifications()
  const open = ref(false)
  const removeOpen = ref(false)
  const editing = ref<DataSource>()
  const testing = ref('')
  const clearSecret = ref(false)
  const connectionStatus = reactive<Record<string, { ok: boolean, label: string } | undefined>>({})
  const form = reactive<DataSourceInput>(defaults())
  const route = useRoute()
  const tab = computed({
    get: () => route.query.section === 'telegram-destinations' ? 'telegram-destinations' : 'data-sources',
    set: (value: string) => router.replace({ path: '/configuration', query: value === 'telegram-destinations' ? { section: 'telegram-destinations' } : {} })
  })
  const search = ref('')
  const filteredSources = computed(() => sources.value.filter(item => (item.name + ' ' + item.url).toLowerCase().includes(search.value.toLowerCase())))
  function defaults(): DataSourceInput {
    return { name: '', url: '', queryLanguage: 'flux', database: '', organization: '', username: '', secret: '' }
  }
  function edit(source?: DataSource) {
    editing.value = source
    clearSecret.value = false
    error.value = ''
    Object.assign(form, defaults(), source ? { ...source, secret: '' } : {})
    open.value = true
  }
  async function save() {
    await perform(async () => {
      const id = editing.value?.id
      await apiRequest(id ? `data-sources/${id}` : 'data-sources', {
        method: id ? 'PUT' : 'POST',
        body: { ...form, secret: clearSecret.value ? '' : form.secret || undefined }
      })
      if (id) connectionStatus[id] = undefined
      open.value = false
      await refresh()
      toast.add({ title: 'Data source saved', color: 'success' })
    })
  }
  async function test(source: DataSource) {
    testing.value = source.id
    try {
      const result = await apiRequest<{ duration: number }>(`data-sources/${source.id}/test`, { method: 'POST' })
      connectionStatus[source.id] = { ok: true, label: `Connected · ${result.duration} ms` }
    } catch (failure) {
      connectionStatus[source.id] = { ok: false, label: apiErrorMessage(failure) }
    } finally {
      testing.value = ''
    }
  }
  async function remove() {
    if (!editing.value) return
    const id = editing.value.id
    await perform(async () => {
      await apiRequest(`data-sources/${id}`, { method: 'DELETE' })
      removeOpen.value = false
      await refresh()
    })
  }
  return { sources, loadError, status, refresh, busy, perform, error, toast, open, removeOpen, editing, testing, clearSecret, connectionStatus, form, route, tab, search, filteredSources, defaults, edit, save, test, remove }
}

const context = createFeatureContext(createConfiguration, 'Configuration')
export const provideConfiguration = context.provide
export const useConfiguration = context.use
