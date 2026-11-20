<script setup lang="ts">
import { cloneValue } from '#shared/utils/clone'
import { defaultPanelOptions } from '#shared/domain/panel'
import { panelDataSourceId } from '#shared/utils/dashboard-variables'
import type { Panel } from '#shared/domain/panel'
import type { QueryRequest } from '#shared/domain/query'

const props = defineProps<{ panel: Panel, range: QueryRequest['range'], from?: string, to?: string, variables?: import('#shared/domain/variable').VariableValues }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ apply: [panel: Panel], closed: [] }>()
const { data: sources } = useDataSources()
const draft = ref<Panel>(cloneValue(props.panel))
draft.value.options ??= defaultPanelOptions()
const options = computed(() => draft.value.options!)
const queries = computed({
  get: () => [draft.value.query, ...draft.value.additionalQueries],
  set: (values: string[]) => {
    draft.value.query = values[0] ?? ''
    draft.value.additionalQueries = values.slice(1)
  }
})
const effectiveSourceId = computed(() => panelDataSourceId(draft.value, props.variables))
const source = computed(() => sources.value.find(item => item.id === effectiveSourceId.value))
const sourceItems = computed(() => [{ label: 'Select data source', value: '@none' }, ...sources.value.map(item => ({ label: item.name, value: item.id }))])
const { results, failures, loading, run: runQueries, cancel } = useQueryRunner()
const error = ref('')
const tab = ref('queries')
const inspector = ref(false)
const textFields = computed(() => [...new Set(results.value.flatMap(result => result.columns))])
let previewTimer: ReturnType<typeof setTimeout> | undefined

async function run() {
  error.value = ''
  const inputs = draft.value.type === 'text' || !effectiveSourceId.value
    ? []
    : queries.value.filter(query => query.trim()).map(query => ({
        dataSourceId: effectiveSourceId.value!, query, range: props.range, from: props.from, to: props.to, variables: props.variables
      }))
  await runQueries(inputs)
  error.value = failures.value.join(' · ')
}
watch(() => [effectiveSourceId.value, draft.value.query, draft.value.additionalQueries], () => {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(run, 800)
}, { deep: true })
watch(open, (value) => {
  if (!value) cancel()
})
onMounted(run)
onBeforeUnmount(() => {
  clearTimeout(previewTimer)
})

function apply() {
  if (!draft.value.title.trim()) {
    error.value = 'Enter a panel title.'
    return
  }
  if (options.value.min !== undefined && options.value.max !== undefined && options.value.min >= options.value.max) {
    error.value = 'Maximum must be greater than minimum.'
    return
  }
  emit('apply', cloneValue({ ...draft.value, additionalQueries: draft.value.additionalQueries.filter(query => query.trim()) }))
}
useErrorToast(() => open.value ? error.value : '', 'Panel query failed')
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    title="Edit panel"
    :ui="{ content: 'rounded-none', header: 'hidden', body: 'panel-editor-body' }"
    :close="false"
    @after:leave="emit('closed')"
  >
    <template #body>
      <header class="flex shrink-none flex-wrap items-center justify-between gap-space-md border-b border-default bg-default px-space-lg py-space-md">
        <h1 class="min-w-none flex-fill truncate text-sm font-semibold text-highlighted">
          Edit panel
        </h1>
        <div class="toolbar">
          <UButton
            size="sm"
            label="Discard"
            color="neutral"
            variant="outline"
            @click="open = false"
          /><UButton
            size="sm"
            label="Apply panel"
            icon="i-lucide-check"
            @click="apply"
          />
        </div>
      </header>
      <div class="grid min-h-none flex-fill overflow-y-auto bg-muted lg:grid-cols-editor">
        <div class="flex min-w-none flex-col">
          <div class="border-b border-default p-space-lg">
            <div class="surface flex h-placeholder flex-col p-space-lg">
              <div class="mb-space-lg flex items-center justify-between">
                <h2 class="text-sm font-semibold text-highlighted">
                  {{ draft.title || 'New panel' }}
                </h2><span
                  v-if="loading"
                  class="flex items-center gap-space-sm text-xs text-muted"
                ><UIcon
                  name="i-lucide-loader-circle"
                  class="size-icon-xs animate-spin"
                />Updating preview</span>
              </div>
              <div class="min-h-none flex-fill">
                <QueryVisualization
                  :results="results"
                  :type="draft.type"
                  :options="options"
                  compact
                />
              </div>
            </div>
          </div>
          <div class="flex min-h-placeholder flex-fill flex-col bg-default">
            <div class="flex flex-wrap items-center justify-between gap-space-md border-b border-default px-space-lg">
              <UTabs
                v-model="tab"
                :items="[{ label: 'Queries', value: 'queries' }, { label: 'Field settings', value: 'transform' }]"
                :content="false"
              />
              <UButton
                label="Query inspector"
                icon="i-lucide-scan-search"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="inspector = true"
              />
            </div>
            <div class="space-y-space-lg p-space-lg">
              <template v-if="tab === 'queries'">
                <div class="flex flex-wrap items-center justify-between gap-space-md">
                  <div class="flex min-w-none max-w-full flex-wrap items-center gap-space-sm">
                    <span class="text-xs text-muted">Data source</span><USelect
                      placeholder="Select a data source"
                      size="sm"
                      :model-value="effectiveSourceId || '@none'"
                      :items="sourceItems"
                      aria-label="Panel data source"
                      class="w-sidebar min-w-none max-w-full"
                      @update:model-value="draft.dataSourceId = $event === '@none' ? null : $event; draft.dataSourceVariable = undefined; draft.queryLanguage = sources.find(item => item.id === $event)?.queryLanguage"
                    />
                  </div>
                  <UButton
                    size="sm"
                    label="Run queries"
                    icon="i-lucide-play"
                    :loading="loading"
                    :disabled="!effectiveSourceId || !queries.some(query => query.trim())"
                    @click="run"
                  />
                </div>
                <QueryWorkbench
                  v-model="queries"
                  :source="source"
                  :range="range"
                  @run="run"
                />
              </template>
              <template v-else>
                <p class="text-sm text-muted">
                  Hide or rename fields in the visualization. Query results remain available in the inspector.
                </p>
                <UFormField label="Hide fields">
                  <USelectMenu
                    v-model="options.hiddenFields"
                    :items="textFields"
                    multiple
                    class="w-full"
                    placeholder="Select fields"
                  />
                </UFormField>
                <div
                  v-for="field in textFields"
                  :key="field"
                  class="grid grid-cols-pair items-center gap-space-md"
                >
                  <span class="truncate font-mono text-xs text-muted">{{ field }}</span><UInput
                    size="sm"
                    :model-value="options.renameFields[field]"
                    placeholder="Display name"
                    @update:model-value="options.renameFields[field] = String($event)"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
        <PanelAppearanceForm v-model="draft" />
      </div>
      <QueryInspector
        v-model:open="inspector"
        :results="results"
        :queries="queries"
      />
    </template>
  </UModal>
</template>
