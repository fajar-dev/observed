import type { Ref } from 'vue'
import type { DataSource } from '#shared/domain/data-source'
import type { DashboardDefinition, DashboardDiagnostic } from '#shared/domain/dashboard'

export function useDashboardImport(sources: Ref<DataSource[]>, refresh: () => Promise<unknown>) {
  const router = useRouter()
  const apiRequest = useApiRequest()
  const { busy, perform, error } = useAsyncAction()
  const open = ref(false)
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
      await router.push(`/dashboards/${saved.id}?edit=1`)
    })
  }
  watch([json, dataSourceId], () => {
    preview.value = undefined
    diagnostics.value = undefined
  })

  return { busy, error, open, json, dataSourceId, diagnostics, checking, preview, sourceOptions, startImport, readFile, inspect, checkImport, importDashboard }
}
