import type { Ref } from 'vue'
import type { DashboardDefinition, DashboardSection } from '#shared/domain/dashboard'
import type { Panel } from '#shared/domain/panel'
import { DashboardLayout } from '#shared/utils/dashboard-layout'

export function useDashboardSections(draft: Ref<DashboardDefinition>, editing: Ref<boolean>) {
  const sectionOpen = ref(false)
  const sectionId = ref<string>()
  const sectionForm = reactive({ title: '' })
  const collapsedRows = ref<Record<string, boolean>>({})
  watch(editing, () => {
    collapsedRows.value = {}
  })
  const toast = useNotifications()
  function editSection(section?: DashboardSection) {
    if (!section && (draft.value.sections?.length ?? 0) >= 100) {
      toast.add({ title: 'Row limit reached', description: 'A dashboard supports up to 100 rows.', color: 'warning' })
      return
    }
    editing.value = true
    sectionId.value = section?.id
    sectionForm.title = section?.title ?? 'New row'
    sectionOpen.value = true
  }
  function saveSection() {
    draft.value = new DashboardLayout(draft.value).normalized()
    const section = draft.value.sections?.find(section => section.id === sectionId.value)
    if (section) section.title = sectionForm.title.trim()
    else {
      const y = Math.max(0, ...draft.value.panels.map(panel => (panel.y ?? 0) + (panel.height ?? 5)), ...draft.value.sections?.map(section => section.y + 1) ?? [])
      draft.value.sections ??= []
      draft.value.sections.push({ id: crypto.randomUUID(), title: sectionForm.title.trim(), y, collapsed: false })
    }
    sectionOpen.value = false
  }
  function collapseSection(section: DashboardSection, collapsed: boolean) {
    collapsedRows.value[section.id] = collapsed
    if (!editing.value) return
    const current = draft.value.sections?.find(item => item.id === section.id)
    if (current) current.collapsed = collapsed
  }
  function moveSection(section: DashboardSection, direction: -1 | 1) {
    draft.value = new DashboardLayout(draft.value).withSectionMoved(section.id, direction)
  }
  function removeSection(section: DashboardSection) {
    draft.value = new DashboardLayout(draft.value).withoutSection(section.id)
  }
  function movePanel(panel: Panel, sectionId: string | null) {
    draft.value = new DashboardLayout(draft.value).withPanelMoved(panel.id, sectionId)
    const target = draft.value.sections?.find(section => section.id === sectionId)
    if (target) {
      target.collapsed = false
      collapsedRows.value[target.id] = false
    }
  }
  function compactLayout() {
    draft.value = new DashboardLayout(draft.value).compacted()
  }
  return { collapsedRows, sectionOpen, sectionId, sectionForm, editSection, saveSection, collapseSection, moveSection, removeSection, movePanel, compactLayout }
}
