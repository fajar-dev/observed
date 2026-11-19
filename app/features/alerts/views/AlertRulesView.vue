<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AlertRule } from '#shared/domain/alert-rule'

const { alerts, loadError, status, sources, destinations, busy, error, search, stateFilter, open, removeOpen, editing, evaluating, destinationName, filtered, edit, indicator, evaluate, remove, menu } = provideAlertRules()
const columns: TableColumn<AlertRule>[] = [
  { id: 'state', header: 'State', meta: { class: { th: 'w-compact', td: 'whitespace-nowrap' } } },
  { accessorKey: 'name', header: 'Alert rule', meta: { class: { th: 'w-full', td: 'min-w-field' } } },
  { id: 'condition', header: 'Condition', meta: { class: { td: 'whitespace-nowrap' } } },
  { id: 'destinations', header: 'Telegram', meta: { class: { td: 'min-w-field-sm' } } },
  { id: 'evaluation', header: 'Last evaluation', meta: { class: { td: 'whitespace-nowrap' } } },
  { id: 'actions', header: 'Actions', meta: { class: { th: 'w-compact text-right', td: 'w-compact text-right' } } }
]
const operatorSymbols = { gt: '>', gte: '≥', lt: '<', lte: '≤' }
const reducerLabels = { last: 'Last', mean: 'Mean', min: 'Min', max: 'Max' }
function duration(seconds: number) {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
}
function destinationLabels(rule: AlertRule) {
  return rule.telegramDestinationIds.map(id => destinationName.value[id] || 'Unavailable destination').join(', ')
}
</script>

<template>
  <WorkspacePage
    compact
    icon="i-lucide-bell"
    title="Alerts"
    description="InfluxDB alert rules and Telegram notifications."
  >
    <template #actions>
      <UButton
        size="sm"
        label="New alert rule"
        icon="i-lucide-plus"
        :disabled="!sources.length || !destinations.length"
        @click="edit()"
      />
    </template>
    <RequestError :message="loadError || (!open && !removeOpen ? error : '')" />
    <div
      v-if="!sources.length || !destinations.length"
      class="surface flex flex-wrap items-center justify-between gap-space-lg border-warning-muted p-space-lg"
    >
      <div class="flex items-center gap-space-md">
        <UIcon
          name="i-lucide-info"
          class="size-icon-md text-warning"
        /><p class="text-sm text-muted">
          Connect an InfluxDB data source and a Telegram destination to create alert rules.
        </p>
      </div><UButton
        size="sm"
        label="Open Configuration"
        to="/configuration"
        color="neutral"
        variant="outline"
      />
    </div>
    <div class="toolbar">
      <UInput
        v-model="search"
        size="sm"
        icon="i-lucide-search"
        placeholder="Search alert rules"
        aria-label="Search alert rules"
        class="w-full sm:max-w-search"
      /><USelect
        v-model="stateFilter"
        size="sm"
        :items="[{ label: 'All states', value: 'all' }, { label: 'Firing', value: 'firing' }, { label: 'Normal', value: 'normal' }, { label: 'Pending', value: 'pending' }, { label: 'No data', value: 'no_data' }, { label: 'Error', value: 'error' }, { label: 'Paused', value: 'paused' }]"
        aria-label="Filter alert state"
      />
    </div>
    <USkeleton
      v-if="status === 'pending' && !alerts.length"
      class="h-field-sm"
    />
    <UEmpty
      v-else-if="!filtered.length && !loadError"
      variant="naked"
      :title="alerts.length ? 'No matching rules' : 'Keep an eye on what matters'"
      description="Create a threshold rule, preview the condition, and choose the Telegram destinations to notify."
      icon="i-lucide-bell-ring"
      size="sm"
      class="surface py-space-lg"
    />
    <ContentPanel v-else>
      <UTable
        :data="filtered"
        :columns="columns"
      >
        <template #state-cell="{ row }">
          <UBadge
            :label="indicator(row.original).label"
            :color="indicator(row.original).color"
            variant="subtle"
          />
        </template>
        <template #name-cell="{ row }">
          <button
            class="block max-w-summary truncate text-left text-sm font-medium text-highlighted hover:text-primary"
            :title="row.original.summary || row.original.name"
            @click="edit(row.original)"
          >
            {{ row.original.name }}
          </button>
          <p class="mt-space-xs flex items-center gap-space-sm text-xs text-muted">
            <span>{{ sources.find(source => source.id === row.original.dataSourceId)?.name ?? 'Unavailable data source' }}</span>
            <span
              v-if="row.original.severity"
              class="capitalize"
            >· {{ row.original.severity }}</span>
          </p>
        </template>
        <template #condition-cell="{ row }">
          <p class="text-sm text-highlighted">
            {{ reducerLabels[row.original.reducer] }} {{ operatorSymbols[row.original.operator] }} {{ row.original.threshold.toLocaleString() }}
          </p>
          <p class="mt-space-xs text-xs text-muted">
            Every {{ duration(row.original.interval) }} · {{ row.original.pendingFor ? 'For ' + duration(row.original.pendingFor) : 'Immediate' }}
          </p>
        </template>
        <template #destinations-cell="{ row }">
          <p
            class="flex items-center gap-space-sm text-sm text-muted"
            :title="destinationLabels(row.original)"
          >
            <UIcon
              name="i-lucide-send"
              class="size-icon-xs shrink-none"
            />
            <span class="max-w-field-sm truncate">{{ destinationLabels(row.original) || 'No destinations' }}</span>
          </p>
          <p
            v-if="row.original.muteUntil && Date.parse(row.original.muteUntil) > Date.now()"
            class="mt-space-xs text-xs text-muted"
            :title="'Muted until ' + new Date(row.original.muteUntil).toLocaleString()"
          >
            Notifications muted
          </p>
        </template>
        <template #evaluation-cell="{ row }">
          <template v-if="row.original.evaluation">
            <div class="flex items-center gap-space-sm">
              <span class="text-sm font-medium tabular-nums text-highlighted">{{ row.original.evaluation.value === null ? '—' : row.original.evaluation.value.toLocaleString(undefined, { maximumSignificantDigits: 4 }) }}</span>
              <UTooltip
                v-if="row.original.evaluation.message || row.original.evaluation.deliveryError"
                :text="row.original.evaluation.message || row.original.evaluation.deliveryError"
              >
                <UIcon
                  name="i-lucide-circle-alert"
                  class="size-icon-sm text-error"
                  :aria-label="row.original.evaluation.message || row.original.evaluation.deliveryError"
                />
              </UTooltip>
            </div>
            <time
              :datetime="row.original.evaluation.time"
              :title="new Date(row.original.evaluation.time).toLocaleString()"
              class="mt-space-xs block text-xs text-muted"
            >{{ new Date(row.original.evaluation.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</time>
          </template>
          <span
            v-else
            class="text-xs text-dimmed"
          >Not evaluated</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-space-xs">
            <UTooltip text="Evaluate now">
              <UButton
                size="sm"
                icon="i-lucide-play"
                aria-label="Evaluate now"
                color="neutral"
                variant="ghost"
                :loading="evaluating === row.original.id"
                :disabled="busy"
                @click="evaluate(row.original)"
              />
            </UTooltip>
            <UDropdownMenu
              :items="menu(row.original)"
              :content="{ align: 'end' }"
            >
              <UButton
                size="sm"
                icon="i-lucide-ellipsis-vertical"
                aria-label="Alert actions"
                color="neutral"
                variant="ghost"
              />
            </UDropdownMenu>
          </div>
        </template>
      </UTable>
    </ContentPanel>
    <AlertRuleEditor />
    <AlertHistoryDrawer />
    <ConfirmDeleteDialog
      v-model:open="removeOpen"
      :label="editing?.name ?? 'alert rule'"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </WorkspacePage>
</template>
