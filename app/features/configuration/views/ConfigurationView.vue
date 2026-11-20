<script setup lang="ts">
import type { DataSource } from '#shared/domain/data-source'

const telegramDestinations = useTemplateRef('telegramDestinations')
const { sources, loadError, status, busy, error, removeOpen, editing, testing, connectionStatus, tab, search, filteredSources, edit, test, remove } = provideConfiguration()
function menu(source: DataSource) {
  return [
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => edit(source) },
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => {
      editing.value = source
      error.value = ''
      removeOpen.value = true
    } }
  ]
}
useErrorToast(loadError, 'Could not load configuration')
</script>

<template>
  <WorkspacePage
    compact
    icon="i-lucide-settings-2"
    title="Configuration"
    description="InfluxDB data sources and Telegram destinations."
  >
    <template #actions>
      <UButton
        v-if="tab === 'data-sources'"
        size="sm"
        label="Add data source"
        icon="i-lucide-plus"
        @click="edit()"
      />
      <UButton
        v-else
        size="sm"
        label="Add destination"
        icon="i-lucide-plus"
        @click="telegramDestinations?.create()"
      />
    </template>
    <UTabs
      v-model="tab"
      :items="[{ label: 'Data sources', value: 'data-sources', icon: 'i-lucide-database' }, { label: 'Telegram destinations', value: 'telegram-destinations', icon: 'i-lucide-send' }]"
      :content="false"
    />
    <template v-if="tab === 'data-sources'">
      <div class="toolbar">
        <UInput
          v-model="search"
          size="sm"
          icon="i-lucide-search"
          placeholder="Search data sources"
          aria-label="Search data sources"
          class="w-full sm:max-w-search"
        />
      </div>
      <USkeleton
        v-if="status === 'pending' && !sources.length"
        class="h-field-sm"
      />
      <UEmpty
        v-else-if="!sources.length && !loadError"
        variant="naked"
        icon="i-lucide-database"
        title="Connect your first InfluxDB"
        description="Add an InfluxDB data source to query metrics and build dashboards."
        size="sm"
        class="surface py-space-lg"
        :actions="[{ label: 'Add data source', icon: 'i-lucide-plus', size: 'sm', onClick: () => edit() }]"
      />
      <ContentPanel
        v-else
        list
      >
        <ContentRow heading>
          Data source
          <template #details>
            Connection
          </template>
          <template #actions>
            Actions
          </template>
        </ContentRow>
        <ContentRow
          v-for="source in filteredSources"
          :key="source.id"
        >
          <div class="grid size-control-md shrink-none place-items-center rounded-md border border-default bg-muted text-primary">
            <UIcon
              name="i-lucide-database"
              class="size-icon-md"
            />
          </div>
          <button
            class="min-w-none cursor-pointer text-left"
            @click="edit(source)"
          >
            <h2
              class="truncate text-sm font-semibold text-highlighted hover:text-primary"
              :title="source.name"
            >
              {{ source.name }}
            </h2>
            <p class="mt-space-xs text-xs text-dimmed">
              InfluxDB · {{ source.queryLanguage === 'flux' ? 'Flux' : 'InfluxQL' }}
            </p>
          </button>
          <template #details>
            <p>{{ source.url }}</p>
            <p class="mt-space-xs text-dimmed">
              {{ source.database }}
            </p>
          </template>
          <template #actions>
            <UBadge
              v-if="connectionStatus[source.id]"
              :label="connectionStatus[source.id]?.label"
              :color="connectionStatus[source.id]?.ok ? 'success' : 'error'"
              variant="soft"
              class="max-w-field"
            />
            <UTooltip text="Test connection">
              <UButton
                size="sm"
                icon="i-lucide-plug"
                aria-label="Test connection"
                color="neutral"
                variant="ghost"
                :disabled="!!testing || busy"
                :loading="testing === source.id"
                @click="test(source)"
              />
            </UTooltip>
            <UDropdownMenu
              :items="menu(source)"
              :content="{ align: 'end' }"
            >
              <UButton
                size="sm"
                icon="i-lucide-ellipsis-vertical"
                aria-label="Data source actions"
                color="neutral"
                variant="ghost"
                :disabled="busy"
              />
            </UDropdownMenu>
          </template>
        </ContentRow>
        <p
          v-if="!filteredSources.length"
          class="px-space-lg py-space-md text-sm text-muted"
        >
          No data sources match your search.
        </p>
      </ContentPanel>
    </template>
    <TelegramDestinations
      v-else
      ref="telegramDestinations"
    />
    <DataSourceEditor />
    <ConfirmDeleteDialog
      v-model:open="removeOpen"
      :label="editing?.name ?? 'data source'"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </WorkspacePage>
</template>
