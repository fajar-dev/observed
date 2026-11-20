import type { Ref } from 'vue'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { DataSource } from '#shared/domain/data-source'
import type { Panel } from '#shared/domain/panel'
import { defaultPanelOptions } from '#shared/domain/panel'
import { DashboardLayout } from '#shared/utils/dashboard-layout'
import type { PanelLayoutChange } from '#shared/utils/dashboard-layout'
import { cloneValue } from '#shared/utils/clone'

export function useDashboardPanelEditing(draft: Ref<DashboardDefinition>, sources: Ref<DataSource[]>, editing: Ref<boolean>) {
  const notifications = useNotifications()
  const hasCapacity = () => {
    if (draft.value.panels.length < 100) return true
    notifications.add({ title: 'Dashboard panel limit reached', description: 'A dashboard supports up to 100 panels.', color: 'warning' })
    return false
  }
  const panel = ref<Panel>()
  const panelOpen = ref(false)
  const panelSession = ref(0)
  function newPanel(sectionId: string | null = null): Panel {
    const group = new DashboardLayout(draft.value).groups.find(group => (group.section?.id ?? null) === sectionId)
    const y = (group?.section ? group.section.y + 1 : 0) + Math.max(0, ...group?.panels.map(item => (item.y ?? 0) + (item.height ?? 5)) ?? [])
    return { id: crypto.randomUUID(), title: 'New panel', type: 'line', span: (draft.value.columns ?? 12) / 2, dataSourceId: sources.value[0]?.id ?? null, query: '', additionalQueries: [], options: defaultPanelOptions(), x: 0, y, height: 5, sectionId }
  }
  function editPanel(item?: Panel, sectionId: string | null = null) {
    if (!item && !hasCapacity()) return
    panelSession.value++
    panel.value = cloneValue(item ?? newPanel(sectionId))
    editing.value = true
    panelOpen.value = true
  }
  function finishPanelClose() {
    if (!panelOpen.value) panel.value = undefined
  }
  function applyPanel(updated: Panel) {
    const index = draft.value.panels.findIndex(item => item.id === updated.id)
    if (index < 0 && hasCapacity()) draft.value.panels.push(updated)
    else if (index >= 0) draft.value.panels.splice(index, 1, updated)
    draft.value = new DashboardLayout(draft.value).normalized()
    panelOpen.value = false
  }
  function duplicate(item: Panel) {
    if (!hasCapacity()) return
    const copy = cloneValue(item)
    const group = new DashboardLayout(draft.value).groups.find(group => group.panels.some(panel => panel.id === item.id))
    const position = newPanel(group?.section?.id ?? null)
    draft.value.panels.push({ ...copy, id: crypto.randomUUID(), title: (item.title + ' copy').slice(0, 120), x: 0, y: position.y, sectionId: position.sectionId })
    draft.value = new DashboardLayout(draft.value).normalized()
  }
  function updateLayout(changes: PanelLayoutChange[], sectionId: string | null = null) {
    draft.value = new DashboardLayout(draft.value).withLayout(sectionId, changes)
  }

  return { panel, panelOpen, panelSession, newPanel, editPanel, finishPanelClose, applyPanel, duplicate, updateLayout }
}
