<script setup lang="ts">
const { isAdmin, greeting, canViewDashboards, canViewAlerts, canCreateDashboard, canCreateAlert, sources, sourcesStatus, sourcesError, dashboardsStatus, dashboardsError, refreshDashboards, alertsStatus, alertsError, refreshAlerts, recent, active, attention, activity, activityLoading, sourceNames, alertState, summaries } = useOverview()
const quickAccessItems = computed(() => [
  ...(canCreateDashboard.value ? [{ label: 'New dashboard', icon: 'i-lucide-panels-top-left', to: '/dashboards/new' }] : []),
  ...(canCreateAlert.value ? [{ label: 'New alert rule', icon: 'i-lucide-bell-plus', to: '/alerts?new=1', disabled: !sources.value.length }] : [])
])
usePageSeo('Overview', 'Your Observed home for sensor dashboards, alert conditions, and recent monitoring activity.')
</script>

<template>
  <WorkspacePage
    compact
    :title="greeting"
  >
    <template #header>
      <UPageHeader
        :title="greeting"
        description="Open your dashboards and catch up on sensor monitoring."
        :ui="{ root: 'content-toolbar', container: 'w-full', wrapper: 'gap-space-lg', title: 'break-words' }"
      >
        <template
          v-if="quickAccessItems.length"
          #links
        >
          <UDropdownMenu
            :items="quickAccessItems"
            :content="{ align: 'end' }"
          >
            <UButton
              label="Quick access"
              icon="i-lucide-plus"
              trailing-icon="i-lucide-chevron-down"
              size="sm"
            />
          </UDropdownMenu>
        </template>
      </UPageHeader>
    </template>
    <div class="space-y-space-lg">
      <div
        v-if="isAdmin && sourcesStatus === 'success' && !sources.length && !sourcesError"
        class="flex flex-wrap items-center justify-between gap-space-md rounded-md bg-muted p-space-lg"
      >
        <div class="min-w-none">
          <p class="text-sm font-semibold text-highlighted">
            Connect your first sensor source
          </p>
          <p class="mt-space-xs text-xs text-muted">
            Add InfluxDB to start monitoring your sensor data.
          </p>
        </div>
        <UButton
          label="Add data source"
          to="/configuration"
          icon="i-lucide-plus"
          size="sm"
        />
      </div>
      <section
        v-if="summaries.length"
        aria-label="Monitoring summary"
        class="grid gap-space-md"
        :class="[summaries.length > 1 ? 'grid-cols-pair' : undefined, summaries.length === 4 ? 'lg:grid-cols-quartet' : summaries.length === 3 ? 'lg:grid-cols-trio' : undefined]"
      >
        <UCard
          v-for="item in summaries"
          :key="item.label"
        >
          <div class="flex items-center justify-between gap-space-md">
            <p class="text-xs font-medium text-muted">
              {{ item.label }}
            </p>
            <UIcon
              :name="item.icon"
              class="size-icon-sm shrink-none text-dimmed"
            />
          </div>
          <USkeleton
            v-if="item.loading"
            class="mt-space-md h-control-sm w-compact"
          />
          <p
            v-else
            class="mt-space-sm font-heading text-title font-semibold tabular-nums text-highlighted"
          >
            {{ item.failed ? '—' : item.value.toLocaleString('en') }}
          </p>
          <p class="mt-space-xs text-xs text-muted">
            {{ item.failed ? 'Temporarily unavailable' : item.hint }}
          </p>
        </UCard>
      </section>
      <UEmpty
        v-if="!canViewDashboards && !canViewAlerts"
        title="Your monitoring home is ready"
        description="Ask an administrator to assign your sensor dashboards and alert rules."
        icon="i-lucide-shield"
        variant="naked"
        class="p-space-lg"
      />
      <ContentPanel
        v-if="canViewDashboards"
        title="Your dashboards"
        role="region"
        aria-label="Your dashboards"
      >
        <template #actions>
          <UButton
            label="Browse all"
            to="/dashboards"
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-lucide-arrow-right"
          />
        </template>
        <USkeleton
          v-if="dashboardsStatus === 'pending' && !recent.length"
          class="m-space-lg h-compact"
        />
        <div
          v-else-if="dashboardsError && !recent.length"
          class="flex flex-wrap items-center justify-between gap-space-md p-space-lg"
        >
          <p class="text-sm text-muted">
            Dashboards are unavailable
          </p>
          <UButton
            label="Try again"
            color="neutral"
            variant="outline"
            size="sm"
            @click="refreshDashboards()"
          />
        </div>
        <div
          v-else-if="!recent.length"
          class="flex flex-wrap items-center justify-between gap-space-md p-space-lg"
        >
          <p class="text-sm text-muted">
            {{ canCreateDashboard ? 'Build your first sensor dashboard' : 'No dashboards assigned yet' }}
          </p>
          <UButton
            v-if="canCreateDashboard"
            label="Create dashboard"
            to="/dashboards/new"
            icon="i-lucide-plus"
            size="sm"
          />
        </div>
        <ul
          v-else
          class="divide-y divide-default"
        >
          <li
            v-for="dashboard in recent"
            :key="dashboard.id"
          >
            <OverviewDashboardLink :dashboard="dashboard" />
          </li>
        </ul>
      </ContentPanel>
      <div
        v-if="canViewAlerts"
        class="grid min-w-none items-start gap-space-lg lg:grid-cols-pair"
      >
        <ContentPanel
          title="Needs attention"
          role="region"
          aria-label="Alerts needing attention"
        >
          <template #actions>
            <UButton
              label="View rules"
              to="/alerts"
              trailing-icon="i-lucide-arrow-right"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </template>
          <USkeleton
            v-if="alertsStatus === 'pending' && !attention.length"
            class="m-space-lg h-compact"
          />
          <div
            v-else-if="alertsError"
            class="flex flex-wrap items-center justify-between gap-space-md p-space-lg"
          >
            <p class="text-sm text-muted">
              Alert status is unavailable
            </p>
            <UButton
              label="Try again"
              color="neutral"
              variant="outline"
              size="sm"
              @click="refreshAlerts()"
            />
          </div>
          <ul
            v-else-if="attention.length"
            class="divide-y divide-default"
          >
            <li
              v-for="rule in attention.slice(0, 4)"
              :key="rule.id"
            >
              <NuxtLink
                to="/alerts"
                class="flex min-w-none items-start gap-space-md px-space-lg py-space-md hover:bg-muted"
              >
                <UIcon
                  :name="alertState(rule).icon"
                  class="mt-space-xs size-icon-sm shrink-none"
                  :class="alertState(rule).color === 'error' ? 'text-error' : alertState(rule).color === 'warning' ? 'text-warning' : 'text-dimmed'"
                />
                <div class="min-w-none flex-fill">
                  <p class="truncate text-sm font-medium text-highlighted">{{ rule.name }}</p>
                  <p class="mt-space-xs truncate text-xs text-muted">{{ sourceNames[rule.dataSourceId] || 'Sensor source' }} · {{ alertState(rule).message }}</p>
                </div>
                <UBadge
                  :label="alertState(rule).label"
                  :color="alertState(rule).color"
                  variant="subtle"
                  class="shrink-none"
                />
              </NuxtLink>
            </li>
          </ul>
          <div
            v-else
            class="flex flex-wrap items-center justify-between gap-space-md p-space-lg"
          >
            <p class="text-sm text-muted">
              {{ active.length ? 'No alerts need attention' : 'No active alert rules' }}
            </p>
            <UButton
              v-if="!active.length && canCreateAlert && sources.length"
              label="Create alert"
              to="/alerts?new=1"
              icon="i-lucide-plus"
              size="sm"
            />
          </div>
        </ContentPanel>
        <ContentPanel
          title="Recent activity"
          role="region"
          aria-label="Recent monitoring activity"
        >
          <USkeleton
            v-if="activityLoading && !activity.length"
            class="m-space-lg h-compact"
          />
          <ul
            v-else-if="activity.length"
            class="divide-y divide-default"
          >
            <li
              v-for="item in activity"
              :key="item.id"
            >
              <NuxtLink
                to="/alerts"
                class="flex min-w-none items-start gap-space-md px-space-lg py-space-md hover:bg-muted"
              >
                <UIcon
                  :name="item.state === 'firing' ? 'i-lucide-bell-ring' : 'i-lucide-circle-check'"
                  class="mt-space-xs size-icon-sm shrink-none"
                  :class="item.state === 'firing' ? 'text-error' : 'text-success'"
                />
                <div class="min-w-none flex-fill">
                  <p class="truncate text-sm font-medium text-highlighted">{{ item.alertName }}</p>
                  <p class="mt-space-xs truncate text-xs text-muted">{{ item.state === 'firing' ? 'Firing' : 'Recovered' }} · {{ item.sourceName }}</p>
                </div>
                <time
                  :datetime="item.occurredAt"
                  :title="new Date(item.occurredAt).toLocaleString('en')"
                  class="shrink-none text-xs text-dimmed"
                >{{ new Date(item.occurredAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) }}</time>
              </NuxtLink>
            </li>
          </ul>
          <p
            v-else
            class="p-space-lg text-sm text-muted"
          >
            No alert activity yet. Firing and recovery updates will appear here.
          </p>
        </ContentPanel>
      </div>
    </div>
  </WorkspacePage>
</template>
