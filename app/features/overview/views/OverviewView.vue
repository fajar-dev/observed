<script setup lang="ts">
const { isAdmin } = useAuthentication()
const { canCreateDashboard: canWrite, canViewDashboards, canViewAlerts } = useAccessPermissions()
usePageSeo('Overview', 'Review sensor dashboards, structural trends, and configured threshold alerts in Observed.')
const { data: sources, error: sourcesError } = useDataSources()
const { data: dashboards, error: dashboardsError, status } = useDashboards()
const { data: alerts, error: alertsError } = useAlertRuleRecords()
const { data: destinations, error: destinationsError } = useTelegramDestinations()
const firing = computed(() => alerts.value.filter(rule => rule.enabled && rule.evaluation?.state === 'firing'))
const recent = computed(() => [...dashboards.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6))
const summaries = computed(() => [
  ...(isAdmin.value || canViewDashboards.value || canViewAlerts.value ? [{ title: 'Data sources', count: sources.value.length, to: isAdmin.value ? '/configuration' : canViewDashboards.value ? '/dashboards' : '/alerts', icon: 'i-lucide-database' }] : []),
  ...(canViewDashboards.value ? [{ title: 'Dashboards', count: dashboards.value.length, to: '/dashboards', icon: 'i-lucide-panels-top-left' }] : []),
  ...(canViewAlerts.value ? [{ title: 'Firing alerts', count: firing.value.length, to: '/alerts', icon: 'i-lucide-bell-ring' }] : [])
])
useErrorToast(() => sourcesError.value || dashboardsError.value || alertsError.value || destinationsError.value, 'Could not load overview')
</script>

<template>
  <WorkspacePage
    compact
    icon="i-lucide-house"
    title="Overview"
    description="Sensor dashboards, structural trends, and threshold alerts."
  >
    <template #actions>
      <NewDashboardMenu />
    </template>
    <div
      class="toolbar"
      role="group"
      aria-label="Monitoring summary"
    >
      <UButton
        v-for="item in summaries"
        :key="item.title"
        :to="item.to"
        :icon="item.icon"
        :label="item.title + ' · ' + item.count"
        size="sm"
        color="neutral"
        variant="ghost"
      />
    </div>
    <UEmpty
      v-if="!canViewDashboards && !canViewAlerts"
      title="No monitoring access assigned"
      description="Ask an administrator to grant access to your sensor dashboards and alert rules."
      icon="i-lucide-shield"
      variant="naked"
    />
    <div class="grid min-w-none items-start gap-space-lg xl:grid-cols-overview">
      <ContentPanel
        v-if="canViewDashboards"
        list
      >
        <template #header>
          <h2 class="text-sm font-semibold text-highlighted">
            Recent dashboards
          </h2>
        </template>
        <template #actions>
          <UButton
            label="View all"
            to="/dashboards"
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          />
        </template>
        <USkeleton
          v-if="status === 'pending' && !recent.length"
          class="m-space-md h-sidebar"
        />
        <UEmpty
          v-else-if="!recent.length"
          variant="naked"
          title="Create your first dashboard"
          description="Visualize your sensor data or import dashboard JSON."
          icon="i-lucide-panels-top-left"
          size="sm"
          :actions="canWrite ? [{ label: 'Create dashboard', to: '/dashboards/new', icon: 'i-lucide-plus', size: 'sm' }] : []"
        />
        <NuxtLink
          v-for="dashboard in recent"
          :key="dashboard.id"
          :to="'/dashboards/' + dashboard.id"
          class="flex min-w-none items-center gap-space-md px-space-lg py-space-md hover:bg-muted"
        >
          <UIcon
            name="i-lucide-panels-top-left"
            class="size-icon-md shrink-none text-primary"
          />
          <div class="min-w-none flex-fill">
            <p class="truncate text-sm font-medium text-highlighted">{{ dashboard.name }}</p>
            <p class="mt-space-xs text-xs text-muted">{{ dashboard.folder || 'General' }} · {{ dashboard.panels.length }} panels</p>
          </div>
          <span class="shrink-none text-xs text-dimmed">{{ new Date(dashboard.updatedAt).toLocaleDateString('en') }}</span>
        </NuxtLink>
      </ContentPanel>
      <ContentPanel
        v-if="canViewAlerts"
        list
      >
        <template #header>
          <h2 class="text-sm font-semibold text-highlighted">
            Alerts
          </h2>
        </template>
        <template #actions>
          <UButton
            label="View rules"
            to="/alerts"
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          />
        </template>
        <div class="flex items-center gap-space-md px-space-lg py-space-md">
          <UIcon
            :name="firing.length ? 'i-lucide-bell-ring' : 'i-lucide-check-check'"
            class="size-icon-md shrink-none"
            :class="firing.length ? 'text-error' : 'text-muted'"
          />
          <div class="min-w-none">
            <p class="text-sm font-medium text-highlighted">
              {{ firing.length ? firing.length + ' firing alerts' : 'No firing alerts' }}
            </p>
            <p class="mt-space-xs text-xs text-muted">
              {{ alerts.length }} rules · {{ destinations.length }} Telegram destinations
            </p>
          </div>
        </div>
        <NuxtLink
          v-for="rule in firing.slice(0, 4)"
          :key="rule.id"
          to="/alerts"
          class="flex items-center justify-between gap-space-md px-space-lg py-space-md text-sm hover:bg-muted"
        >
          <span class="truncate font-medium">{{ rule.name }}</span><UBadge
            label="Firing"
            color="error"
            variant="subtle"
          />
        </NuxtLink>
        <div
          v-if="isAdmin && !destinations.length"
          class="px-space-lg py-space-md"
        >
          <UButton
            size="sm"
            label="Configure Telegram"
            to="/configuration?section=telegram-destinations"
            icon="i-lucide-send"
            color="neutral"
            variant="outline"
          />
        </div>
      </ContentPanel>
    </div>
  </WorkspacePage>
</template>
