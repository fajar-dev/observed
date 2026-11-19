<script setup lang="ts">
const { sourcesError, importer } = useDashboardLibrary()
const { busy, error, open, json, dataSourceId, diagnostics, checking, preview, sourceOptions, readFile, inspect, checkImport, importDashboard } = importer
useErrorToast(() => open.value ? error.value || sourcesError.value : '', 'Dashboard import failed')

useNotice(() => open.value && diagnostics.value && Object.keys(diagnostics.value.variables.errors).length
  ? {
      title: 'Review import variables',
      description: Object.values(diagnostics.value.variables.errors).join(' '),
      color: 'warning'
    }
  : undefined)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Import dashboard"
    description="Upload or paste dashboard JSON, review its panels, and map each InfluxDB data source."
    :ui="{ content: 'sm:max-w-modal' }"
    :dismissible="!busy"
  >
    <template #body>
      <div class="space-y-space-lg">
        <div class="space-y-space-sm">
          <UFormField label="JSON file">
            <UInput
              size="sm"
              type="file"
              accept=".json,application/json"
              @change="readFile"
            />
          </UFormField>
          <UFormField label="Dashboard JSON">
            <UTextarea
              v-model="json"
              :rows="5"
              class="w-full font-mono"
            />
          </UFormField>
        </div>
        <UFormField label="Default data source">
          <USelect
            v-model="dataSourceId"
            size="sm"
            :items="sourceOptions"
            class="w-full"
          />
        </UFormField>
        <div
          v-if="preview"
          class="space-y-space-lg rounded-md border border-default p-space-lg"
        >
          <UFormField label="Dashboard name">
            <UInput
              v-model="preview.dashboard.name"
              size="sm"
              class="w-full"
            />
          </UFormField>
          <p class="text-sm text-muted">
            {{ preview.dashboard.panels.length }} panels · {{ preview.dashboard.panels.filter(panel => panel.note).length }} need review
          </p>
          <p
            v-for="warning in preview.warnings"
            :key="warning"
            class="text-xs leading-normal text-warning"
          >
            {{ warning }}
          </p>
          <UButton
            size="sm"
            label="Test dashboard queries"
            icon="i-lucide-stethoscope"
            color="neutral"
            variant="outline"
            :loading="checking"
            @click="checkImport"
          />
          <div
            v-if="diagnostics"
            class="space-y-space-sm"
          >
            <p class="text-xs text-muted">
              {{ diagnostics.panels.filter(panel => panel.status === 'ready').length }} ready · {{ diagnostics.panels.filter(panel => panel.status === 'empty').length }} empty · {{ diagnostics.panels.filter(panel => panel.status === 'error').length }} errors
            </p>
            <p
              v-for="panel in diagnostics.panels.filter(panel => panel.status === 'error')"
              :key="panel.id"
              class="text-xs text-error"
            >
              {{ panel.title }} · {{ panel.message }}
            </p>
          </div>
          <div class="max-h-field space-y-space-md overflow-auto border-t border-default pt-space-md">
            <div
              v-for="panel in preview.dashboard.panels"
              :key="panel.id"
              class="space-y-space-xs"
            >
              <div class="flex items-center justify-between gap-space-md">
                <span class="min-w-none truncate text-xs text-highlighted">{{ panel.title }}</span><USelect
                  :model-value="panel.dataSourceId ?? '@none'"
                  :items="sourceOptions"
                  size="xs"
                  class="max-w-field-sm"
                  :aria-label="'Map source for ' + panel.title"
                  @update:model-value="panel.dataSourceId = $event === '@none' ? null : $event; panel.dataSourceVariable = undefined"
                />
              </div>
              <p
                v-if="panel.note"
                class="text-xs text-warning"
              >
                {{ panel.note }}
              </p>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-space-sm">
          <UButton
            size="sm"
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="busy"
            @click="open = false"
          />
          <UButton
            v-if="preview"
            size="sm"
            label="Import dashboard"
            :loading="busy"
            @click="importDashboard"
          />
          <UButton
            v-else
            size="sm"
            label="Preview import"
            :loading="busy"
            @click="inspect"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
