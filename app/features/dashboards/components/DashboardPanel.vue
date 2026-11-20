<script setup lang="ts">
import { panelDataSourceId } from '#shared/utils/dashboard-variables'
import type { Panel } from '#shared/domain/panel'
import type { QueryRequest } from '#shared/domain/query'

const props = defineProps<{ panel: Panel, sections?: import('#shared/domain/dashboard').DashboardSection[], sectionId?: string | null, draggable?: boolean, range: QueryRequest['range'], from?: string, to?: string, variables?: import('#shared/domain/variable').VariableValues, refresh: number, editing: boolean, kiosk?: boolean }>()
const { canWrite } = useAuthentication()
const emit = defineEmits<{ edit: [], remove: [], duplicate: [], move: [sectionId: string | null] }>()
const { results, failures, loading, run } = useQueryRunner()
const inspector = ref(false)
const { data: sources } = useDataSources()
const effectiveSourceId = computed(() => panelDataSourceId(props.panel, props.variables))
const configurationIssue = computed(() => {
  if (!effectiveSourceId.value) return 'Select a data source to connect this panel.'
  if (!queries.value.length) return 'This panel needs a supported InfluxDB query.'
  const source = sources.value.find(source => source.id === effectiveSourceId.value)
  if (source && props.panel.queryLanguage && source.queryLanguage !== props.panel.queryLanguage) return `This panel uses ${props.panel.queryLanguage}. Select a compatible data source.`
  return ''
})
const queries = computed(() => [props.panel.query, ...props.panel.additionalQueries].filter(query => query.trim()))
const menu = computed(() => [
  [...(canWrite.value ? [{ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => emit('edit') }] : []), { label: 'Inspect data', icon: 'i-lucide-scan-search', onSelect: () => {
    inspector.value = true
  } }],
  ...(props.editing ? [[...(props.sections?.length ? [{ label: 'Move to row', icon: 'i-lucide-rows-3', children: [{ label: 'No row', disabled: !props.sectionId, onSelect: () => emit('move', null) }, ...props.sections.map(section => ({ label: section.title, disabled: section.id === props.sectionId, onSelect: () => emit('move', section.id) }))] }] : []), { label: 'Duplicate', icon: 'i-lucide-copy', onSelect: () => emit('duplicate') }, { label: 'Remove', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => emit('remove') }]] : [])
])

function load() {
  const dataSourceId = effectiveSourceId.value
  const inputs = configurationIssue.value || props.panel.type === 'text'
    ? []
    : queries.value.map(query => ({
        dataSourceId: dataSourceId!, range: props.range, from: props.from, to: props.to, variables: props.variables, query
      }))
  return run(inputs)
}
onMounted(() => watch(() => [effectiveSourceId.value, props.panel.query, props.panel.additionalQueries, props.range, props.from, props.to, props.variables, props.refresh], load, { immediate: true, deep: true }))
useErrorToast(() => failures.value.join(' · '), props.panel.title + ' · Query failed')
</script>

<template>
  <UCard
    :as="'section'"
    :ui="{ root: 'panel-surface', header: 'panel-heading panel-drag-handle', body: 'panel-body' }"
  >
    <template #header>
      <div class="flex min-w-none items-center gap-space-sm">
        <UIcon
          v-if="editing && draggable !== false"
          name="i-lucide-grip-vertical"
          class="size-icon-xs shrink-none text-dimmed"
        />
        <h2
          class="truncate text-sm font-semibold text-highlighted"
          :title="panel.title"
        >
          {{ panel.title }}
        </h2>
        <UTooltip
          v-if="panel.note"
          :text="panel.note"
        >
          <UIcon
            name="i-lucide-info"
            class="size-icon-xs text-muted"
          />
        </UTooltip>
      </div>
      <div class="ml-auto flex shrink-none items-center">
        <UIcon
          v-if="loading"
          name="i-lucide-loader-circle"
          class="mr-space-sm size-icon-xs animate-spin text-muted"
        />
        <UDropdownMenu
          v-if="!kiosk"
          :items="menu"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            aria-label="Panel actions"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>
      </div>
    </template>
    <template #default>
      <USkeleton
        v-if="loading && !results.length"
        class="h-full min-h-compact"
      />
      <QueryVisualization
        v-else-if="results.length || panel.type === 'text'"
        :results="results"
        :type="panel.type"
        :options="panel.options"
        compact
      />
      <div
        v-else
        class="flex h-full min-h-compact flex-col items-center justify-center gap-space-sm"
      >
        <UIcon
          v-if="configurationIssue"
          name="i-lucide-unplug"
          class="size-icon-md text-warning"
        />
        <span class="max-w-summary text-center text-sm text-muted">{{ failures.length ? 'Could not load panel data' : configurationIssue || 'No records in this time range' }}</span>
        <UButton
          v-if="failures.length"
          label="Retry"
          icon="i-lucide-refresh-cw"
          size="sm"
          color="neutral"
          variant="ghost"
          :loading="loading"
          @click="load"
        />
        <UButton
          v-if="configurationIssue && !kiosk && canWrite"
          size="sm"
          label="Configure query"
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          @click="emit('edit')"
        />
      </div>
      <QueryInspector
        v-model:open="inspector"
        :results="results"
        :queries="queries"
      />
    </template>
  </UCard>
</template>
