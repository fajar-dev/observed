import type { Ref } from 'vue'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { DashboardVariable } from '#shared/domain/variable'
import { dashboardSchema } from '#shared/domain/dashboard'

export function useDashboardSettings(draft: Ref<DashboardDefinition>, editing: Ref<boolean>, id: string, isNew: boolean) {
  const apiRequest = useApiRequest()
  const toast = useNotifications()
  const settings = ref(false)
  const settingsTab = ref('general')
  const tagText = ref('')
  const jsonDocument = ref('')
  const versionLoading = ref(false)
  const versions = ref<{ id: string, updatedAt: string, snapshot: DashboardDefinition }[]>([])
  const settingsError = ref('')
  const variableValues = ref<Record<string, string>>({})
  const variableTypes = ['custom', 'query', 'datasource', 'constant', 'textbox', 'interval'] as const
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
      toast.add({ title: 'Dashboard JSON applied', description: 'Review the changes and save the dashboard to keep them.' })
      settings.value = false
    } catch (failure) {
      settingsError.value = failure instanceof Error ? failure.message : 'Invalid dashboard JSON'
    }
  }

  return { settings, settingsTab, tagText, jsonDocument, versionLoading, versions, settingsError, variableValues, variableTypes, openSettings, addVariable, updateVariable, exportDashboard, loadVersions, applyJson }
}
