<script setup lang="ts">
const canWrite = useDashboardWriteAccess()
const { kiosk, enterKiosk, exitKiosk } = useDashboardKiosk()
const { draft, editing, dirty, busy, refreshKey, range, from, to, refreshOptions, editPanel, editSection, compactLayout, openSettings, save, discard, healthOpen, exportDashboard } = useDashboardEditor()
const addItems = computed(() => [
  { label: 'Add panel', icon: 'i-lucide-panel-top', disabled: draft.value.panels.length >= 100, onSelect: () => editPanel() },
  { label: 'Add row', icon: 'i-lucide-rows-3', disabled: (draft.value.sections?.length ?? 0) >= 100, onSelect: () => editSection() }
])
const editItems = [
  [{ label: 'Compact layout', icon: 'i-lucide-panels-top-left', onSelect: compactLayout }],
  [{ label: 'Dashboard settings', icon: 'i-lucide-settings', onSelect: openSettings }]
]
</script>

<template>
  <ContentToolbar
    :title="draft.name"
    :description="draft.description || undefined"
    icon="i-lucide-panels-top-left"
    inline
  >
    <template #status>
      <UBadge
        v-if="editing && !kiosk"
        :label="dirty ? 'Unsaved' : 'Editing'"
        :title="dirty ? 'Unsaved changes' : 'Editing dashboard'"
        color="warning"
        variant="subtle"
        class="shrink-none"
      />
    </template>
    <div
      v-if="editing && !kiosk"
      class="flex shrink-none items-center gap-space-sm"
    >
      <UDropdownMenu
        :items="addItems"
        :content="{ align: 'end' }"
      >
        <UButton
          size="sm"
          label="Add"
          icon="i-lucide-plus"
          trailing-icon="i-lucide-chevron-down"
          aria-label="Add to dashboard"
          color="neutral"
          variant="outline"
        />
      </UDropdownMenu>
      <UDropdownMenu
        :items="editItems"
        :content="{ align: 'end' }"
      >
        <UButton
          size="sm"
          icon="i-lucide-ellipsis-vertical"
          aria-label="Dashboard actions"
          color="neutral"
          variant="outline"
        />
      </UDropdownMenu>
      <UButton
        size="sm"
        label="Discard"
        icon="i-lucide-x"
        aria-label="Discard changes"
        :ui="{ label: 'hidden sm:inline', leadingIcon: 'sm:hidden' }"
        color="neutral"
        variant="ghost"
        @click="discard"
      />
      <UButton
        size="sm"
        label="Save"
        aria-label="Save dashboard"
        icon="i-lucide-save"
        :loading="busy"
        @click="save"
      />
    </div>
    <div
      v-else
      class="flex shrink-none items-center gap-space-sm"
    >
      <UButton
        size="sm"
        :label="kiosk ? 'Exit kiosk' : 'Kiosk mode'"
        :aria-label="kiosk ? 'Exit kiosk' : 'Kiosk mode'"
        :ui="{ label: kiosk ? '' : 'hidden sm:inline' }"
        :icon="kiosk ? 'i-lucide-minimize' : 'i-lucide-maximize'"
        :aria-keyshortcuts="kiosk ? 'Escape' : undefined"
        color="neutral"
        variant="outline"
        @click="kiosk ? exitKiosk() : enterKiosk()"
      />
      <UButton
        v-if="canWrite && !kiosk"
        size="sm"
        label="Edit dashboard"
        icon="i-lucide-pencil"
        color="neutral"
        variant="outline"
        @click="editing = true"
      />
      <UDropdownMenu
        v-if="!kiosk"
        :content="{ align: 'end' }"
        :items="[...(canWrite ? [{ label: 'Dashboard settings', icon: 'i-lucide-settings', onSelect: openSettings }] : []), { label: 'Check panel data', icon: 'i-lucide-stethoscope', onSelect: () => healthOpen = true }, { label: 'Export JSON', icon: 'i-lucide-download', onSelect: exportDashboard }]"
      >
        <UButton
          size="sm"
          icon="i-lucide-ellipsis-vertical"
          aria-label="Dashboard actions"
          color="neutral"
          variant="outline"
        />
      </UDropdownMenu>
    </div>
    <div class="flex min-w-none max-w-full items-center gap-space-sm">
      <USeparator
        orientation="vertical"
        class="hidden h-control-sm shrink-none md:block"
      />
      <TimeRangePicker
        v-model="range"
        v-model:from="from"
        v-model:to="to"
      />
      <UButton
        size="sm"
        icon="i-lucide-refresh-cw"
        aria-label="Refresh panels"
        color="neutral"
        variant="outline"
        @click="refreshKey++"
      />
      <USelect
        v-model="draft.refresh"
        size="sm"
        :items="refreshOptions"
        aria-label="Auto refresh"
      />
    </div>
  </ContentToolbar>
</template>
