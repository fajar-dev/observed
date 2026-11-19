<script setup lang="ts">
import { defaultPanelOptions } from '#shared/domain/panel'

const { busy, error, open, editing, preview, previewLoading, form, source, sourceOptions, operators, save, previewCondition, alertRuleSchema, ranges } = useAlertRules()
const previewOptions = defaultPanelOptions()
const previewResults = computed(() => preview.value?.queryResult ? [preview.value.queryResult] : [])
const previewColor = computed(() => ({ firing: 'error', normal: 'success', no_data: 'warning', error: 'error', pending: 'warning' } as const)[preview.value?.state ?? 'pending'])
useErrorToast(() => open.value ? error.value : '', 'Alert rule could not be saved')

useNotice(() => open.value && preview.value?.message
  ? {
      title: 'Alert condition preview',
      description: preview.value.message,
      color: previewColor.value
    }
  : undefined)
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="editing ? 'Edit alert rule' : 'New alert rule'"
    description="Build a query, preview its condition, and configure Telegram notifications."
    :close="false"
    :dismissible="!busy"
    :ui="{ content: 'rounded-none', header: 'hidden', body: 'panel-editor-body', overlay: 'bg-muted' }"
  >
    <template #body>
      <UForm
        :schema="alertRuleSchema"
        :state="form"
        class="flex min-h-none flex-fill flex-col"
        @submit="save"
      >
        <header class="flex shrink-none flex-wrap items-center justify-between gap-space-md border-b border-default bg-default px-space-lg py-space-md">
          <h1 class="min-w-none flex-fill truncate text-sm font-medium text-highlighted">
            {{ editing ? 'Edit alert rule' : 'New alert rule' }}
          </h1>
          <div class="toolbar">
            <UButton
              size="sm"
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="busy"
              @click="open = false"
            />
            <UButton
              size="sm"
              label="Save rule"
              icon="i-lucide-save"
              type="submit"
              :loading="busy"
              :disabled="previewLoading"
            />
          </div>
        </header>
        <div class="grid min-h-none flex-fill overflow-y-auto bg-muted lg:grid-cols-editor">
          <div class="min-w-none">
            <div class="border-b border-default p-space-lg">
              <div class="surface flex h-placeholder flex-col p-space-lg">
                <div class="toolbar mb-space-md justify-between">
                  <h2 class="text-sm font-medium text-highlighted">
                    Query preview
                  </h2>
                  <UBadge
                    v-if="preview"
                    :label="preview.state + (preview.value !== null ? ' · ' + preview.value : '')"
                    :color="previewColor"
                    variant="subtle"
                  />
                  <span
                    v-else
                    class="text-xs text-muted"
                  >Run a preview to inspect your data</span>
                </div>
                <div class="min-h-none flex-fill">
                  <USkeleton
                    v-if="previewLoading"
                    class="h-full w-full"
                  />
                  <QueryVisualization
                    v-else
                    :results="previewResults"
                    type="line"
                    :options="previewOptions"
                    compact
                  />
                </div>
              </div>
            </div>
            <div class="space-y-space-lg bg-default p-space-lg">
              <div class="flex flex-col items-stretch gap-space-md sm:flex-row sm:items-end sm:justify-between">
                <div class="toolbar min-w-none sm:flex-fill">
                  <UFormField
                    name="dataSourceId"
                    label="Data source"
                    class="w-full sm:w-field"
                  >
                    <USelect
                      v-model="form.dataSourceId"
                      size="sm"
                      :items="sourceOptions"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    name="range"
                    label="Query time range"
                    class="w-full sm:w-auto"
                  >
                    <USelect
                      v-model="form.range"
                      size="sm"
                      :items="[...ranges]"
                      class="w-full"
                    />
                  </UFormField>
                </div>
                <UButton
                  size="sm"
                  label="Preview condition"
                  icon="i-lucide-play"
                  class="w-full sm:w-auto"
                  :loading="previewLoading"
                  :disabled="!form.query.trim() || !form.dataSourceId"
                  @click="previewCondition"
                />
              </div>
              <ContentPanel title="Query">
                <UFormField
                  name="query"
                  class="p-space-lg"
                >
                  <QueryEditor
                    v-model="form.query"
                    :source="source"
                    :range="form.range"
                    builder
                    @run="previewCondition"
                  />
                </UFormField>
              </ContentPanel>
              <ContentPanel title="Alert condition">
                <div class="grid gap-space-md p-space-lg sm:grid-cols-pair xl:grid-cols-quartet">
                  <UFormField
                    name="field"
                    label="Numeric field"
                  >
                    <UInput
                      v-model="form.field"
                      size="sm"
                      placeholder="Auto"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    name="reducer"
                    label="Reduce"
                  >
                    <USelect
                      v-model="form.reducer"
                      size="sm"
                      :items="['last', 'mean', 'min', 'max']"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    name="operator"
                    label="Condition"
                  >
                    <USelect
                      v-model="form.operator"
                      size="sm"
                      :items="operators"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    name="threshold"
                    label="Threshold"
                  >
                    <UInput
                      v-model.number="form.threshold"
                      size="sm"
                      type="number"
                      step="any"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </ContentPanel>
              <p class="text-xs text-muted">
                Preview evaluates your query and threshold without sending Telegram notifications.
              </p>
            </div>
          </div>
          <AlertRuleSettings />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
