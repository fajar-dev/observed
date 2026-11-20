<script setup lang="ts">
const { isNew, sources, folders, busy, error, toast, draft, original, editing, range, settings, settingsTab, removeOpen, tagText, jsonDocument, versionLoading, versions, settingsError, variableTypes, save, addVariable, updateVariable, exportDashboard, applyJson, cloneValue } = useDashboardEditor()
useErrorToast(() => settings.value ? error.value || settingsError.value : '')
</script>

<template>
  <USlideover
    v-model:open="settings"
    title="Dashboard settings"
    :ui="{ content: 'sm:max-w-modal' }"
  >
    <template #body>
      <UTabs
        v-model="settingsTab"
        :content="false"
        :items="[{ label: 'General', value: 'general' }, { label: 'Variables', value: 'variables' }, { label: 'Versions', value: 'versions' }, { label: 'JSON', value: 'json' }]"
      />
      <div class="mt-space-lg space-y-space-lg">
        <template v-if="settingsTab === 'general'">
          <UFormField
            label="Dashboard name"
            required
          >
            <UInput
              v-model="draft.name"
              size="sm"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Description">
            <UTextarea
              v-model="draft.description"
              :rows="3"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Folder">
            <USelect
              size="sm"
              :model-value="draft.folder ? 'folder:' + draft.folder : '@general'"
              :items="[{ label: 'General', value: '@general' }, ...[...new Set([...folders.map(item => item.name), ...(draft.folder ? [draft.folder] : [])])].map(name => ({ label: name, value: 'folder:' + name }))]"
              class="w-full"
              @update:model-value="draft.folder = $event === '@general' ? '' : $event.slice(7)"
            />
          </UFormField>
          <UFormField
            label="Tags"
            hint="Comma separated"
          >
            <UInput
              size="sm"
              :model-value="tagText"
              class="w-full"
              placeholder="bridge, north-span, structural"
              @update:model-value="tagText = String($event); draft.tags = tagText.split(',').map(tag => tag.trim()).filter(Boolean)"
            />
          </UFormField>
          <UButton
            size="sm"
            label="Use current range as default"
            icon="i-lucide-clock-3"
            color="neutral"
            variant="outline"
            @click="draft.range = range; toast.add({ title: 'Default time range updated' })"
          />
          <div
            v-if="!isNew"
            class="border-t border-default pt-space-lg"
          >
            <UButton
              size="sm"
              label="Delete dashboard"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              @click="removeOpen = true"
            />
          </div>
        </template>
        <template v-else-if="settingsTab === 'variables'">
          <p class="text-sm leading-relaxed text-muted">
            Create a custom dropdown or load values from an InfluxDB query. Use <code class="text-primary">$variableName</code> in a query. Values are escaped for the selected query language.
          </p>
          <UCard
            v-for="(variable, index) in draft.variables"
            :key="index"
            :ui="{ body: 'space-y-space-md' }"
          >
            <div class="flex items-start gap-space-sm">
              <UFormField
                label="Name"
                class="flex-fill"
              >
                <UInput
                  v-model="variable.name"
                  size="sm"
                  class="w-full"
                />
              </UFormField><UButton
                size="sm"
                icon="i-lucide-trash-2"
                aria-label="Remove variable"
                color="error"
                variant="ghost"
                @click="draft.variables?.splice(index, 1)"
              />
            </div>
            <UFormField label="Display label">
              <UInput
                v-model="variable.label"
                size="sm"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Variable type">
              <USelect
                size="sm"
                :model-value="variable.type ?? 'custom'"
                :items="[...variableTypes]"
                class="w-full"
                @update:model-value="variable.type = $event"
              />
            </UFormField>
            <template v-if="variable.type === 'query'">
              <UFormField label="Data source">
                <USelect
                  size="sm"
                  :model-value="variable.dataSourceId || sources[0]?.id"
                  :items="sources.map(source => ({ label: source.name, value: source.id }))"
                  class="w-full"
                  @update:model-value="variable.dataSourceId = $event"
                />
              </UFormField>
              <UFormField label="Variable query">
                <UTextarea
                  v-model="variable.query"
                  :rows="5"
                  class="w-full font-mono"
                  placeholder="buckets() or a metadata query returning one column"
                />
              </UFormField>
            </template>
            <div class="flex gap-space-lg">
              <UCheckbox
                v-model="variable.multi"
                :disabled="variable.type === 'datasource'"
                label="Allow multiple values"
              /><UCheckbox
                v-model="variable.includeAll"
                :disabled="variable.type === 'datasource'"
                label="Include All option"
              />
            </div>
            <UFormField
              v-if="variable.type !== 'query' && variable.type !== 'datasource'"
              label="Values"
              hint="Comma separated"
            >
              <UInput
                size="sm"
                :model-value="variable.values.join(', ')"
                class="w-full"
                @change="updateVariable(variable, ($event.target as HTMLInputElement).value)"
              />
            </UFormField>
            <UFormField label="Default value">
              <USelect
                v-model="variable.current"
                size="sm"
                :items="variable.values"
                class="w-full"
              />
            </UFormField>
          </UCard>
          <UButton
            size="sm"
            label="Add variable"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            :disabled="(draft.variables?.length ?? 0) >= 20"
            @click="addVariable"
          />
        </template>
        <template v-else-if="settingsTab === 'versions'">
          <p class="text-sm text-muted">
            Each save creates a version. Restore a previous version into the editor, review it, and save.
          </p>
          <USkeleton
            v-if="versionLoading"
            class="h-compact"
          />
          <UEmpty
            v-else-if="!versions.length"
            title="No previous versions"
            description="Version history starts after the next dashboard update."
            size="sm"
          />
          <div
            v-for="version in versions"
            :key="version.id"
            class="flex items-center justify-between gap-space-md border-b border-default pb-space-md"
          >
            <div>
              <p class="text-sm font-medium">
                Version {{ version.snapshot.revision || 1 }}
              </p><p class="mt-space-xs text-xs text-muted">
                {{ new Date(version.updatedAt).toLocaleString() }}
              </p>
            </div>
            <UButton
              size="sm"
              label="Restore"
              color="neutral"
              variant="outline"
              @click="draft = cloneValue({ ...version.snapshot, revision: original?.revision ?? 1 }); settings = false; editing = true"
            />
          </div>
        </template>
        <template v-else>
          <UTextarea
            v-model="jsonDocument"
            class="w-full font-mono"
            :rows="24"
            aria-label="Dashboard JSON"
          />
          <div class="toolbar">
            <UButton
              size="sm"
              label="Apply JSON to draft"
              @click="applyJson"
            /><UButton
              size="sm"
              label="Download JSON"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              @click="exportDashboard"
            />
          </div>
        </template>
      </div>
    </template>
    <template #footer>
      <UButton
        size="sm"
        label="Save dashboard"
        icon="i-lucide-save"
        :loading="busy"
        @click="save"
      /><UButton
        size="sm"
        label="Close"
        color="neutral"
        variant="ghost"
        @click="settings = false"
      />
    </template>
  </USlideover>
</template>
