<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Dashboard } from '#shared/domain/dashboard'

const { canCreateDashboard: canWrite } = useAccessPermissions()
const { isAdmin } = useAuthentication()
const { dashboards, loadError, status, busy, error, importer, filter, folder, view, sort, tag, folderOpen, folderName, removeOpen, selected, folderNames, allTags, filtered, startImport, rowMenu, createFolder, remove } = provideDashboardLibrary()
const { open } = importer
const columns: TableColumn<Dashboard>[] = [{ accessorKey: 'name', header: 'Name' }, { accessorKey: 'folder', header: 'Folder' }, { accessorKey: 'tags', header: 'Tags' }, { accessorKey: 'updatedAt', header: 'Updated' }, { id: 'actions', header: 'Actions', meta: { class: { th: 'w-control-md text-right', td: 'w-control-md text-right' } } }]
useErrorToast(() => loadError.value || (!open.value && !removeOpen.value ? error.value : ''))
</script>

<template>
  <WorkspacePage
    compact
    icon="i-lucide-panels-top-left"
    title="Dashboards"
    description="Build and organize sensor dashboards for your structures."
  >
    <template #actions>
      <UButton
        v-if="isAdmin"
        size="sm"
        label="New folder"
        icon="i-lucide-folder-plus"
        color="neutral"
        variant="outline"
        @click="folderOpen = true"
      />
      <NewDashboardMenu :import-action="startImport" />
    </template>
    <div class="toolbar justify-between">
      <div class="toolbar flex-fill">
        <UInput
          v-model="filter"
          size="sm"
          icon="i-lucide-search"
          placeholder="Search dashboards"
          aria-label="Search dashboards"
          class="w-search max-w-full"
        />
        <USelect
          v-model="folder"
          size="sm"
          :items="[{ label: 'All folders', value: '@all' }, { label: 'General', value: 'folder:General' }, ...folderNames.filter(name => name !== 'General').map(name => ({ label: name, value: 'folder:' + name }))]"
          aria-label="Filter folder"
        />
        <USelect
          v-model="tag"
          size="sm"
          :items="[{ label: 'All tags', value: '@all' }, ...allTags.map(name => ({ label: name, value: 'tag:' + name }))]"
          aria-label="Filter tag"
        />
      </div>
      <div class="toolbar">
        <USelect
          v-model="sort"
          size="sm"
          :items="[{ label: 'Recently updated', value: 'updated' }, { label: 'Name A–Z', value: 'name' }]"
          aria-label="Sort dashboards"
        />
        <ViewToggle v-model="view" />
      </div>
    </div>
    <USkeleton
      v-if="status === 'pending' && !dashboards.length"
      class="h-placeholder rounded-lg"
    />
    <UEmpty
      v-else-if="!filtered.length"
      variant="naked"
      icon="i-lucide-panels-top-left"
      size="sm"
      class="surface py-space-lg"
      :title="dashboards.length ? 'No matching dashboards' : 'Create your first dashboard'"
      :description="dashboards.length ? 'Try a different search or filter.' : 'Visualize your sensor data or import dashboard JSON.'"
      :actions="dashboards.length || !canWrite ? [] : [{ label: 'Create dashboard', to: '/dashboards/new', icon: 'i-lucide-plus', size: 'sm' }]"
    />
    <ContentPanel v-else-if="view === 'list'">
      <UTable
        :data="filtered"
        :columns="columns"
      >
        <template #name-cell="{ row }">
          <NuxtLink
            :to="'/dashboards/' + row.original.id"
            class="flex min-w-none items-center gap-space-md font-medium text-highlighted hover:text-primary"
          ><UIcon
            name="i-lucide-panels-top-left"
            class="size-icon-md shrink-none text-primary"
          /><span class="truncate">{{ row.original.name }}</span></NuxtLink>
          <p
            v-if="row.original.description"
            class="mt-space-xs max-w-summary truncate text-xs text-muted"
          >
            {{ row.original.description }}
          </p>
        </template>
        <template #folder-cell="{ row }">
          {{ row.original.folder || 'General' }}
        </template>
        <template #tags-cell="{ row }">
          <div class="flex flex-wrap gap-space-xs">
            <UBadge
              v-for="label in row.original.tags"
              :key="label"
              :label="label"
              color="neutral"
              variant="subtle"
            />
          </div>
        </template>
        <template #updatedAt-cell="{ row }">
          <span class="whitespace-nowrap">{{ new Date(row.original.updatedAt).toLocaleDateString() }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu
            :items="rowMenu(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              size="sm"
              icon="i-lucide-ellipsis-vertical"
              aria-label="Dashboard actions"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </ContentPanel>
    <div
      v-else
      class="grid gap-space-md sm:grid-cols-pair xl:grid-cols-trio"
    >
      <UCard
        v-for="item in filtered"
        :key="item.id"
      >
        <div class="flex items-center gap-space-md">
          <UIcon
            name="i-lucide-panels-top-left"
            class="size-icon-md shrink-none text-primary"
          />
          <NuxtLink
            :to="'/dashboards/' + item.id"
            class="min-w-none flex-fill truncate text-sm font-medium text-highlighted hover:text-primary"
            :title="item.name"
          >{{ item.name }}</NuxtLink>
          <UDropdownMenu
            :items="rowMenu(item)"
            :content="{ align: 'end' }"
          >
            <UButton
              size="sm"
              icon="i-lucide-ellipsis-vertical"
              aria-label="Dashboard actions"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </div>
        <p
          v-if="item.description"
          class="mt-space-xs line-clamp-summary text-xs text-muted"
        >
          {{ item.description }}
        </p>
        <div class="mt-space-sm flex flex-wrap items-center gap-space-sm text-xs text-dimmed">
          <span>{{ item.folder || 'General' }}</span><span>·</span><span>{{ item.panels.length }} panels</span>
        </div>
      </UCard>
    </div>
    <UModal
      v-model:open="folderOpen"
      title="New folder"
      description="Organize related dashboards."
    >
      <template #body>
        <UFormField label="Folder name">
          <UInput
            v-model="folderName"
            size="sm"
            class="w-full"
            @keydown.enter="createFolder"
          />
        </UFormField>
      </template>
      <template #footer>
        <UButton
          size="sm"
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="folderOpen = false"
        /><UButton
          size="sm"
          label="Create folder"
          :loading="busy"
          :disabled="!folderName.trim()"
          @click="createFolder"
        />
      </template>
    </UModal>
    <DashboardImportDialog />
    <ConfirmDeleteDialog
      v-model:open="removeOpen"
      :label="selected?.name ?? 'dashboard'"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </WorkspacePage>
</template>
