<script setup lang="ts">
const { kiosk, exitKiosk } = useDashboardKiosk()
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && kiosk.value) {
    event.preventDefault()
    void exitKiosk()
  }
}
onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
const { draft, ready, isNew, sourcesError, error, removeOpen, settings, variableErrors, variablesLoading, refreshVariables, resolvedVariables, editing, range, from, to, refreshKey, panel, panelOpen, panelSession, finishPanelClose, healthOpen, busy, editPanel, updateLayout, duplicate, remove, applyPanel, setDashboard, refreshList } = provideDashboardEditor()
</script>

<template>
  <WorkspacePage
    :title="draft.name"
    :header-hidden="kiosk"
    dashboard
  >
    <template #header>
      <DashboardEditorHeader v-if="!kiosk" />
    </template>
    <RequestError :message="sourcesError || (!removeOpen && !settings ? error : '')" />
    <UAlert
      v-if="Object.keys(variableErrors).length"
      icon="i-lucide-list-filter"
      title="Review dashboard filters"
      :description="Object.values(variableErrors).join(' ')"
      color="warning"
      :actions="[{ label: 'Reload values', onClick: refreshVariables }]"
    />
    <USkeleton
      v-if="!ready || variablesLoading"
      class="h-placeholder w-full rounded-lg"
    />
    <template v-else>
      <DashboardVariables v-if="!kiosk" />
      <DashboardGrid
        v-if="draft.panels.length && !Object.keys(variableErrors).length"
        :key="draft.columns ?? 12"
        :columns="draft.columns ?? 12"
        :sections="draft.sections"
        :panels="draft.panels"
        :editing="editing && !kiosk"
        :kiosk="kiosk"
        :range="range"
        :from="from"
        :to="to"
        :variables="resolvedVariables"
        :refresh="refreshKey"
        @layout="updateLayout"
        @edit="editPanel"
        @remove="item => draft.panels = draft.panels.filter(panel => panel.id !== item.id)"
        @duplicate="duplicate"
      />
      <UEmpty
        v-else-if="!draft.panels.length"
        icon="i-lucide-panels-top-left"
        :title="kiosk ? 'No panels' : 'Add your first panel'"
        description="Choose a data source, build a query, and select a visualization."
        :actions="kiosk ? [] : [{ label: 'Add panel', icon: 'i-lucide-plus', onClick: () => editPanel() }]"
      />
      <UEmpty
        v-else
        icon="i-lucide-list-filter"
        title="Choose filter values"
        description="Resolve the filters above to load your panels."
      />
    </template>
    <PanelEditor
      v-if="panel"
      :key="panelSession"
      v-model:open="panelOpen"
      :panel="panel"
      :range="range"
      :from="from"
      :to="to"
      :variables="resolvedVariables"
      @apply="applyPanel"
      @closed="finishPanelClose"
    />
    <DashboardDiagnostics
      v-if="!isNew && ready"
      v-model:open="healthOpen"
      :dashboard="{ ...draft, id: String($route.params.id) }"
      @repaired="setDashboard($event); refreshList(); refreshVariables()"
    />
    <DashboardSettingsDrawer />
    <UButton
      v-if="kiosk"
      size="sm"
      label="Exit kiosk"
      icon="i-lucide-minimize"
      color="neutral"
      variant="outline"
      class="kiosk-exit"
      aria-keyshortcuts="Escape"
      @click="exitKiosk"
    />
    <ConfirmDeleteDialog
      v-model:open="removeOpen"
      :label="draft.name"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </WorkspacePage>
</template>
