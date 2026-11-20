<script setup lang="ts">
import type { DashboardSection } from '#shared/domain/dashboard'
import type { Panel } from '#shared/domain/panel'
import type { QueryRequest } from '#shared/domain/query'
import { DashboardLayout } from '#shared/utils/dashboard-layout'
import type { PanelLayoutChange } from '#shared/utils/dashboard-layout'

const props = defineProps<{ columns?: 12 | 24, sections?: DashboardSection[], collapsedRows?: Record<string, boolean>, panels: Panel[], editing: boolean, kiosk?: boolean, range: QueryRequest['range'], from?: string, to?: string, variables?: import('#shared/domain/variable').VariableValues, refresh: number }>()
const emit = defineEmits<{
  'layout': [changes: PanelLayoutChange[], sectionId: string | null]
  'edit': [panel: Panel]
  'remove': [panel: Panel]
  'duplicate': [panel: Panel]
  'move': [panel: Panel, sectionId: string | null]
  'edit-section': [section: DashboardSection]
  'remove-section': [section: DashboardSection]
  'move-section': [section: DashboardSection, direction: -1 | 1]
  'add-panel': [sectionId: string]
  'collapse-section': [section: DashboardSection, collapsed: boolean]
}>()
const groups = computed(() => new DashboardLayout(props).groups.filter(group => group.section || group.panels.length))
const collapsed = (section: DashboardSection) => props.collapsedRows?.[section.id] ?? section.collapsed ?? false
function toggle(section: DashboardSection) {
  emit('collapse-section', section, !collapsed(section))
}
const original = (panel: Panel) => props.panels.find(item => item.id === panel.id)!
function title(section: DashboardSection) {
  return section.title.replace(/\$\{([^}]+)\}|\$(\w+)/g, (token, first, second) => {
    const value = props.variables?.[first || second]
    return value ? Array.isArray(value) ? value.join(', ') : value : token
  })
}
function actions(section: DashboardSection) {
  const index = groups.value.filter(group => group.section).findIndex(group => group.section?.id === section.id)
  return [
    [{ label: 'Add panel to row', icon: 'i-lucide-plus', onSelect: () => emit('add-panel', section.id) }, { label: 'Rename row', icon: 'i-lucide-pencil', onSelect: () => emit('edit-section', section) }],
    [{ label: 'Move row up', icon: 'i-lucide-arrow-up', disabled: index === 0, onSelect: () => emit('move-section', section, -1) }, { label: 'Move row down', icon: 'i-lucide-arrow-down', disabled: index === (props.sections?.length ?? 0) - 1, onSelect: () => emit('move-section', section, 1) }],
    [{ label: 'Remove row, keep panels', icon: 'i-lucide-list-minus', onSelect: () => emit('remove-section', section) }]
  ]
}
</script>

<template>
  <div class="flex min-w-none flex-col gap-space-md">
    <section
      v-for="group in groups"
      :key="group.section?.id ?? 'ungrouped'"
      :data-section-id="group.section?.id ?? 'ungrouped'"
      class="min-w-none"
    >
      <div
        v-if="group.section"
        class="flex min-w-none items-center gap-space-sm"
      >
        <UButton
          :id="'row-trigger-' + group.section.id"
          :label="title(group.section)"
          :icon="collapsed(group.section) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          :aria-expanded="!collapsed(group.section)"
          :aria-controls="'row-content-' + group.section.id"
          :aria-label="(collapsed(group.section) ? 'Expand row ' : 'Collapse row ') + title(group.section)"
          class="min-w-none flex-fill justify-start text-highlighted"
          :ui="{ label: 'truncate' }"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="toggle(group.section)"
        />
        <span class="shrink-none text-xs text-dimmed">{{ group.panels.length }} {{ group.panels.length === 1 ? 'panel' : 'panels' }}</span>
        <UDropdownMenu
          v-if="editing && !kiosk"
          :items="actions(group.section)"
          :content="{ align: 'end' }"
        >
          <UButton
            :aria-label="'Row actions ' + title(group.section)"
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </UDropdownMenu>
      </div>
      <UCollapsible :open="!group.section || !collapsed(group.section)">
        <template #content>
          <div
            :id="group.section ? 'row-content-' + group.section.id : undefined"
            :aria-labelledby="group.section ? 'row-trigger-' + group.section.id : undefined"
          >
            <DashboardPanelGrid
              v-if="group.panels.length"
              :columns="columns"
              :panels="group.panels"
              :sections="sections"
              :section-id="group.section?.id ?? null"
              :editing="editing"
              :kiosk="kiosk"
              :range="range"
              :from="from"
              :to="to"
              :variables="variables"
              :refresh="refresh"
              @layout="changes => emit('layout', changes, group.section?.id ?? null)"
              @edit="panel => emit('edit', original(panel))"
              @remove="panel => emit('remove', original(panel))"
              @duplicate="panel => emit('duplicate', original(panel))"
              @move="(panel, sectionId) => emit('move', original(panel), sectionId)"
            />
            <div
              v-else-if="editing && group.section"
              class="flex items-center justify-center rounded-sm border border-dashed border-default p-space-xl"
            >
              <UButton
                label="Add panel to row"
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="emit('add-panel', group.section.id)"
              />
            </div>
          </div>
        </template>
      </UCollapsible>
    </section>
  </div>
</template>
