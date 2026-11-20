<script setup lang="ts">
const { canWrite } = useAuthentication()
const { kiosk, exitKiosk } = useDashboardKiosk()
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && kiosk.value) {
    // Let the topmost popup consume Escape before leaving kiosk.
    if (event.defaultPrevented || document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]')) return
    event.preventDefault()
    void exitKiosk()
  }
}
onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
const { draft, ready, isNew, sourcesError, error, removeOpen, settings, variableErrors, variablesLoading, refreshVariables, resolvedVariables, editing, range, from, to, refreshKey, panel, panelOpen, panelSession, finishPanelClose, collapsedRows, editSection, removeSection, moveSection, collapseSection, movePanel, healthOpen, busy, editPanel, updateLayout, duplicate, remove, applyPanel, setDashboard, refreshList } = provideDashboardEditor()
useErrorToast(() => sourcesError.value || (!removeOpen.value && !settings.value ? error.value : ''))

useNotice(() => Object.keys(variableErrors.value).length
  ? {
      title: 'Review dashboard filters',
      description: Object.values(variableErrors.value).join(' '),
      color: 'warning',
      actions: [{ label: 'Reload values', onClick: refreshVariables }]
    }
  : undefined)
</script>

<template>
  <WorkspacePage
    :title="draft.name"
    dashboard
  >
    <template #header>
      <DashboardEditorHeader />
    </template>
    <USkeleton
      v-if="!ready || variablesLoading"
      class="h-placeholder w-full rounded-lg"
    />
    <template v-else>
      <DashboardVariables />
      <DashboardGrid
        v-if="(draft.panels.length || draft.sections?.length) && !Object.keys(variableErrors).length"
        :key="draft.columns ?? 12"
        :columns="draft.columns ?? 12"
        :sections="draft.sections"
        :collapsed-rows="collapsedRows"
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
        @edit-section="editSection"
        @remove-section="removeSection"
        @move-section="moveSection"
        @collapse-section="collapseSection"
        @move="movePanel"
        @add-panel="sectionId => editPanel(undefined, sectionId)"
      />
      <UEmpty
        v-else-if="!draft.panels.length"
        icon="i-lucide-panels-top-left"
        :title="kiosk ? 'No panels' : 'Add your first panel'"
        description="Choose a data source, build a query, and select a visualization."
        :actions="kiosk || !canWrite ? [] : [{ label: 'Add panel', icon: 'i-lucide-plus', onClick: () => editPanel() }]"
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
    <DashboardSectionEditor />
    <ConfirmDeleteDialog
      v-model:open="removeOpen"
      :label="draft.name"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </WorkspacePage>
</template>
