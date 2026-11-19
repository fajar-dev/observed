import { alertPreviewSchema, alertRuleSchema } from '#shared/domain/alert-rule'
import { cloneValue } from '#shared/utils/clone'
import { ranges } from '#shared/domain/query'
import type { AlertRulePreview, AlertRuleInput, AlertRule } from '#shared/domain/alert-rule'

function createAlertRules() {
  const apiRequest = useApiRequest()
  const { canWrite } = useAuthentication()
  useSeoMeta({ title: 'Alerts · AMTI Observe' })
  const { data: alerts, error: loadError, status, refresh } = useAlertRuleRecords()
  const { data: sources, status: sourcesStatus, error: sourcesError } = useDataSources()
  const { data: destinations, status: destinationsStatus, error: destinationsError } = useTelegramDestinations()
  const { busy, error, perform } = useAsyncAction()
  const toast = useNotifications()
  const route = useRoute()
  const search = ref('')
  const stateFilter = ref('all')
  const open = ref(false)
  const removeOpen = ref(false)
  const historyOpen = ref(false)
  const editing = ref<AlertRule>()
  const evaluating = ref('')
  const preview = ref<AlertRulePreview>()
  const previewLoading = ref(false)
  const form = reactive<AlertRuleInput>(defaults())
  const source = computed(() => sources.value.find(item => item.id === form.dataSourceId))
  const destinationName = computed(() => Object.fromEntries(destinations.value.map(item => [item.id, item.name])))
  const sourceOptions = computed(() => sources.value.map(item => ({ label: item.name, value: item.id })))
  const destinationOptions = computed(() => destinations.value.map(item => ({ label: item.name, value: item.id })))
  const operators = [{ label: 'Is above', value: 'gt' }, { label: 'Is above or equal', value: 'gte' }, { label: 'Is below', value: 'lt' }, { label: 'Is below or equal', value: 'lte' }]
  const filtered = computed(() => alerts.value.filter(rule => rule.name.toLowerCase().includes(search.value.toLowerCase()) && (stateFilter.value === 'all' || indicator(rule).state === stateFilter.value)))
  function defaults(): AlertRuleInput {
    return { name: '', dataSourceId: '', query: '', range: '15m', enabled: true, telegramDestinationIds: [], field: '', operator: 'gt', reducer: 'last', threshold: 80, interval: 60, pendingFor: 0, severity: 'warning', summary: '', folder: '', muteUntil: null }
  }
  function edit(rule?: AlertRule) {
    editing.value = rule
    Object.assign(form, defaults(), rule ? cloneValue(rule) : { dataSourceId: sources.value[0]?.id ?? '', telegramDestinationIds: destinations.value.length === 1 ? [destinations.value[0]!.id] : [] })
    error.value = ''
    preview.value = undefined
    open.value = true
  }
  function indicator(rule: AlertRule) {
    const state = !rule.enabled ? 'paused' : rule.evaluation?.state ?? 'pending'
    const labels = { paused: 'Paused', pending: 'Pending', normal: 'Normal', firing: 'Firing', no_data: 'No data', error: 'Error' }
    const colors = { paused: 'neutral', pending: 'warning', normal: 'success', firing: 'error', no_data: 'warning', error: 'error' } as const
    return { label: labels[state], color: colors[state], state }
  }
  async function save() {
    await perform(async () => {
      const id = editing.value?.id
      await apiRequest(id ? 'alert-rules/' + id : 'alert-rules', { method: id ? 'PUT' : 'POST', body: alertRuleSchema.parse(form) })
      open.value = false
      await refresh()
      toast.add({ title: 'Alert rule saved', color: 'success' })
    })
  }
  async function evaluate(rule: AlertRule) {
    evaluating.value = rule.id
    try {
      await perform(async () => {
        await apiRequest('alert-rules/' + rule.id + '/evaluate', { method: 'POST' })
        await refresh()
        toast.add({ title: 'Rule evaluated' })
      })
    } finally {
      evaluating.value = ''
    }
  }
  let previewRequest = 0
  async function previewCondition() {
    const request = ++previewRequest
    previewLoading.value = true
    error.value = ''
    preview.value = undefined
    try {
      const result = await apiRequest<AlertRulePreview>('alert-rules/preview', { method: 'POST', body: alertPreviewSchema.parse(form) })
      if (request === previewRequest) preview.value = result
    } catch (failure) {
      if (request === previewRequest) error.value = apiErrorMessage(failure)
    } finally {
      if (request === previewRequest) previewLoading.value = false
    }
  }
  async function updateRule(rule: AlertRule, patch: Partial<AlertRuleInput>) {
    await perform(async () => {
      await apiRequest('alert-rules/' + rule.id, { method: 'PUT', body: alertRuleSchema.parse({ ...rule, ...patch }) })
      await refresh()
    })
  }
  async function remove() {
    if (!editing.value) return
    await perform(async () => {
      await apiRequest('alert-rules/' + editing.value!.id, { method: 'DELETE' })
      removeOpen.value = false
      await refresh()
    })
  }
  function menu(rule: AlertRule) {
    const muted = rule.muteUntil && Date.parse(rule.muteUntil) > Date.now()
    if (!canWrite.value) return [{ label: 'Evaluation history', icon: 'i-lucide-history', onSelect: () => {
      editing.value = rule
      historyOpen.value = true
    } }]
    return [
      { label: 'Edit rule', icon: 'i-lucide-pencil', onSelect: () => edit(rule) },
      { label: rule.enabled ? 'Pause evaluation' : 'Resume evaluation', icon: rule.enabled ? 'i-lucide-pause' : 'i-lucide-play', onSelect: () => updateRule(rule, { enabled: !rule.enabled }) },
      { label: muted ? 'Unmute notifications' : 'Mute for 1 hour', icon: 'i-lucide-bell-off', onSelect: () => updateRule(rule, { muteUntil: muted ? null : new Date(Date.now() + 3600_000).toISOString() }) },
      { label: 'Evaluation history', icon: 'i-lucide-history', onSelect: () => {
        editing.value = rule
        historyOpen.value = true
      } },
      { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => {
        editing.value = rule
        error.value = ''
        removeOpen.value = true
      } }
    ]
  }
  watch(() => [form.query, form.field, form.threshold, form.operator, form.reducer, form.dataSourceId, form.range], () => {
    previewRequest++
    previewLoading.value = false
    preview.value = undefined
  })
  watch(open, () => {
    previewRequest++
    previewLoading.value = false
    preview.value = undefined
  })
  let openedFromRoute = false
  watch(() => [route.query.new, sources.value.length, destinations.value.length], () => {
    if (canWrite.value && !openedFromRoute && route.query.new && sources.value.length && destinations.value.length) {
      openedFromRoute = true
      edit()
    }
  }, { immediate: true })
  onMounted(() => {
    const timer = setInterval(() => {
      if (!open.value && !removeOpen.value && !busy.value && document.visibilityState === 'visible') void refresh()
    }, 15000)
    onScopeDispose(() => clearInterval(timer))
  })
  return { alerts, loadError, status, refresh, sources, sourcesStatus, sourcesError, destinations, destinationsStatus, destinationsError, busy, error, perform, toast, route, search, stateFilter, open, removeOpen, historyOpen, editing, evaluating, preview, previewLoading, form, source, destinationName, sourceOptions, destinationOptions, operators, filtered, defaults, edit, indicator, save, evaluate, previewCondition, updateRule, remove, menu, alertRuleSchema, ranges }
}

const context = createFeatureContext(createAlertRules, 'AlertRules')
export const provideAlertRules = context.provide
export const useAlertRules = context.use
