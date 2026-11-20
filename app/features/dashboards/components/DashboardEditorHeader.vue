<script setup lang="ts">
const { canWrite } = useAuthentication()
const { enterKiosk } = useDashboardKiosk()
const { draft, editing, dirty, busy, refreshKey, range, from, to, refreshOptions, editPanel, editSection, compactLayout, openSettings, save, discard, healthOpen, exportDashboard } = useDashboardEditor()
</script>

<template>
  <ContentToolbar
    :title="draft.name"
    :description="draft.description || undefined"
    icon="i-lucide-panels-top-left"
  >
    <template #status>
      <UBadge
        v-if="editing"
        :label="dirty ? 'Unsaved changes' : 'Editing'"
        color="warning"
        variant="subtle"
        class="shrink-none"
      />
    </template>
    <template v-if="editing">
      <UButton
        size="sm"
        label="Add panel"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        :disabled="draft.panels.length >= 100"
        @click="editPanel()"
      />
      <UButton
        size="sm"
        label="Add row"
        icon="i-lucide-rows-3"
        color="neutral"
        variant="outline"
        :disabled="(draft.sections?.length ?? 0) >= 100"
        @click="editSection()"
      />
      <UTooltip text="Remove empty space and align panels within each row">
        <UButton
          size="sm"
          label="Compact layout"
          icon="i-lucide-panels-top-left"
          color="neutral"
          variant="ghost"
          @click="compactLayout"
        />
      </UTooltip>
      <UButton
        size="sm"
        icon="i-lucide-settings"
        aria-label="Dashboard settings"
        color="neutral"
        variant="outline"
        @click="openSettings"
      />
      <UButton
        size="sm"
        label="Discard"
        color="neutral"
        variant="ghost"
        @click="discard"
      />
      <UButton
        size="sm"
        label="Save dashboard"
        icon="i-lucide-save"
        :loading="busy"
        @click="save"
      />
    </template>
    <template v-else>
      <UButton
        size="sm"
        label="Kiosk mode"
        icon="i-lucide-maximize"
        color="neutral"
        variant="outline"
        @click="enterKiosk"
      />
      <UButton
        v-if="canWrite"
        size="sm"
        label="Edit dashboard"
        icon="i-lucide-pencil"
        color="neutral"
        variant="outline"
        @click="editing = true"
      />
      <UDropdownMenu
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
    </template>
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
  </ContentToolbar>
</template>
