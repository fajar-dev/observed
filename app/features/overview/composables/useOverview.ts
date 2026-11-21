import type { AlertRule } from '#shared/domain/alert-rule'

const alertStates = {
  firing: { label: 'Firing', color: 'error', icon: 'i-lucide-bell-ring', message: 'Threshold condition met', priority: 0 },
  error: { label: 'Error', color: 'error', icon: 'i-lucide-circle-alert', message: 'Query could not be evaluated', priority: 1 },
  no_data: { label: 'No data', color: 'warning', icon: 'i-lucide-unplug', message: 'No numeric readings returned', priority: 2 },
  pending: { label: 'Pending', color: 'warning', icon: 'i-lucide-clock-3', message: 'Waiting for the pending period', priority: 3 },
  unevaluated: { label: 'Not evaluated', color: 'neutral', icon: 'i-lucide-clock-3', message: 'Waiting for the first evaluation', priority: 4 },
  normal: { label: 'Normal', color: 'success', icon: 'i-lucide-circle-check', message: 'Within the configured threshold', priority: 5 },
  paused: { label: 'Paused', color: 'neutral', icon: 'i-lucide-pause', message: 'Evaluation is paused', priority: 6 }
} as const

export function useOverview() {
  const { user, isAdmin } = useAuthentication()
  const access = useAccessPermissions()
  const { data: sources, error: sourcesError, status: sourcesStatus } = useDataSources()
  const { data: dashboards, error: dashboardsError, status: dashboardsStatus, refresh: refreshDashboards } = useDashboards()
  const { data: alerts, error: alertsError, status: alertsStatus, refresh: refreshAlerts } = useAlertRuleRecords()
  const { data: destinations, error: destinationsError, status: destinationsStatus } = useTelegramDestinations()
  const { snapshot, loading: activityLoading } = useAlertNotifications()
  const name = computed(() => user.value?.name.trim().split(/\s+/)[0])
  const greeting = computed(() => name.value ? `Welcome back, ${name.value}` : 'Welcome to Observed')
  const recent = computed(() => [...dashboards.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4))
  const active = computed(() => alerts.value.filter(rule => rule.enabled))
  function alertState(rule: AlertRule) {
    return alertStates[!rule.enabled ? 'paused' : rule.evaluation?.state ?? 'unevaluated']
  }
  const attention = computed(() => active.value.filter(rule => rule.evaluation?.state !== 'normal').sort((a, b) => alertState(a).priority - alertState(b).priority || a.name.localeCompare(b.name, 'en')))
  const activity = computed(() => snapshot.value.items.slice(0, 4))
  const sourceNames = computed(() => Object.fromEntries(sources.value.map(source => [source.id, source.name])))
  const summaries = computed(() => [
    ...(access.canViewDashboards.value ? [{ label: 'Dashboards', value: dashboards.value.length, hint: 'Available to your account', icon: 'i-lucide-panels-top-left', loading: dashboardsStatus.value === 'pending', failed: !!dashboardsError.value }] : []),
    ...(access.canViewAlerts.value
      ? [
          { label: 'Active rules', value: active.value.length, hint: 'Enabled threshold rules', icon: 'i-lucide-activity', loading: alertsStatus.value === 'pending', failed: !!alertsError.value },
          { label: 'Telegram destinations', value: destinations.value.length, hint: 'Available alert delivery destinations', icon: 'i-lucide-send', loading: destinationsStatus.value === 'pending', failed: !!destinationsError.value }
        ]
      : []),
    ...(isAdmin.value ? [{ label: 'Data sources', value: sources.value.length, hint: 'Configured InfluxDB connections', icon: 'i-lucide-database', loading: sourcesStatus.value === 'pending', failed: !!sourcesError.value }] : [])
  ])
  useErrorToast(() => sourcesError.value || dashboardsError.value || alertsError.value || destinationsError.value, 'Could not load home')
  onMounted(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && access.canViewAlerts.value && alertsStatus.value !== 'pending') void refreshAlerts()
    }, 30000)
    onScopeDispose(() => clearInterval(timer))
  })
  return { ...access, isAdmin, greeting, sources, sourcesStatus, sourcesError, dashboardsStatus, dashboardsError, refreshDashboards, alertsStatus, alertsError, refreshAlerts, recent, active, attention, activity, activityLoading, sourceNames, alertState, summaries }
}
