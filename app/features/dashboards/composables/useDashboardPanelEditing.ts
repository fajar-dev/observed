import type { Ref } from 'vue'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { DataSource } from '#shared/domain/data-source'
import type { Panel } from '#shared/domain/panel'
import { defaultPanelOptions } from '#shared/domain/panel'
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
  function newPanel(): Panel {
    const y = Math.max(0, ...draft.value.panels.map(item => (item.y ?? 0) + (item.height ?? 5)))
    return { id: crypto.randomUUID(), title: 'New panel', type: 'line', span: (draft.value.columns ?? 12) / 2, dataSourceId: sources.value[0]?.id ?? null, query: '', additionalQueries: [], options: defaultPanelOptions(), x: 0, y: draft.value.panels.length ? y : 0, height: 5 }
  }
  function editPanel(item?: Panel) {
    if (!item && !hasCapacity()) return
    panelSession.value++
    panel.value = cloneValue(item ?? newPanel())
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
    panelOpen.value = false
  }
  function duplicate(item: Panel) {
    if (!hasCapacity()) return
    const copy = cloneValue(item)
    draft.value.panels.push({ ...copy, id: crypto.randomUUID(), title: (item.title + ' copy').slice(0, 120), y: newPanel().y })
  }
  function updateLayout(changes: { id: string, x: number, y: number, span: number, height: number }[]) {
    for (const change of changes) {
      const current = draft.value.panels.find(item => item.id === change.id)
      if (current) Object.assign(current, { ...change, span: Math.min(draft.value.columns ?? 12, change.span) })
    }
  }

  return { panel, panelOpen, panelSession, newPanel, editPanel, finishPanelClose, applyPanel, duplicate, updateLayout }
}
