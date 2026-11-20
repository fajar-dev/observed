import type { DashboardDefinition, DashboardSection } from '../domain/dashboard'
import type { Panel } from '../domain/panel'

export type PanelLayoutChange = { id: string, x: number, y: number, span: number, height: number }
export type DashboardGroup = { section?: DashboardSection, panels: Panel[] }

function placePanels(panels: Panel[], columns: number, compact = false): Panel[] {
  const placed: Panel[] = []
  for (const panel of panels) {
    const span = Math.max(1, Math.min(columns, panel.span))
    const height = panel.height ?? 5
    let x = Math.max(0, Math.min(columns - span, panel.x ?? 0))
    let y = Math.max(0, panel.y ?? 0)
    const fits = (left: number, top: number) => !placed.some(item => left < item.x! + item.span && left + span > item.x! && top < item.y! + item.height! && top + height > item.y!)
    if (compact || panel.x === undefined || panel.y === undefined || !fits(x, y)) {
      y = 0
      x = 0
      while (!fits(x, y)) {
        if (++x > columns - span) {
          x = 0
          y++
        }
      }
    }
    placed.push({ ...panel, x, y, span, height })
  }
  return placed
}

/** Row membership is explicit after editing; imported dashboards can still use global grid coordinates. */
export class DashboardLayout<T extends Pick<DashboardDefinition, 'panels' | 'sections' | 'columns'>> {
  constructor(private readonly dashboard: T) {}

  get groups(): DashboardGroup[] {
    const sections = [...this.dashboard.sections ?? []].sort((a, b) => a.y - b.y)
    const groups: DashboardGroup[] = [{ panels: [] }, ...sections.map(section => ({ section, panels: [] as Panel[] }))]
    for (const panel of this.dashboard.panels) {
      const section = panel.sectionId === undefined
        ? sections.findLast(section => section.y <= (panel.y ?? -1))
        : sections.find(section => section.id === panel.sectionId)
      const group = groups.find(group => group.section?.id === section?.id)!
      group.panels.push({ ...panel, sectionId: section?.id ?? null, y: panel.y === undefined ? undefined : Math.max(0, panel.y - (section ? section.y + 1 : 0)) })
    }
    return groups.map(group => ({ ...group, panels: placePanels(group.panels, this.dashboard.columns ?? 12) }))
  }

  private serialize(groups: DashboardGroup[]): T {
    let y = 0
    const panels: Panel[] = [], sections: DashboardSection[] = []
    for (const group of groups) {
      if (group.section) sections.push({ ...group.section, y: y++ })
      panels.push(...group.panels.map(panel => ({ ...panel, sectionId: group.section?.id ?? null, y: y + (panel.y ?? 0) })))
      y += Math.max(0, ...group.panels.map(panel => (panel.y ?? 0) + (panel.height ?? 5)))
    }
    return { ...this.dashboard, sections, panels }
  }

  normalized() { return this.serialize(this.groups) }

  withLayout(sectionId: string | null, changes: PanelLayoutChange[]) {
    const updates = new Map(changes.map(change => [change.id, change]))
    return this.serialize(this.groups.map(group => (group.section?.id ?? null) === sectionId
      ? { ...group, panels: placePanels(group.panels.map(panel => ({ ...panel, ...updates.get(panel.id) })), this.dashboard.columns ?? 12) }
      : group))
  }

  withPanelMoved(panelId: string, sectionId: string | null) {
    const groups = this.groups
    const target = groups.find(group => (group.section?.id ?? null) === sectionId)
    const panel = groups.flatMap(group => group.panels).find(panel => panel.id === panelId)
    if (!target || !panel) return this.dashboard
    if (target.panels.some(panel => panel.id === panelId)) return this.dashboard
    for (const group of groups) group.panels = group.panels.filter(panel => panel.id !== panelId)
    const y = Math.max(0, ...target.panels.map(panel => panel.y! + panel.height!))
    target.panels.push({ ...panel, x: 0, y })
    return this.serialize(groups)
  }

  withSectionMoved(sectionId: string, direction: -1 | 1) {
    const groups = this.groups
    const index = groups.findIndex(group => group.section?.id === sectionId)
    const target = index + direction
    if (index < 1 || target < 1 || target >= groups.length) return this.dashboard
    const previous = groups[index]!
    groups[index] = groups[target]!
    groups[target] = previous
    return this.serialize(groups)
  }

  withoutSection(sectionId: string) {
    const groups = this.groups
    const removed = groups.find(group => group.section?.id === sectionId)
    if (!removed) return this.dashboard
    const ungrouped = groups[0]!
    const y = Math.max(0, ...ungrouped.panels.map(panel => panel.y! + panel.height!))
    ungrouped.panels = placePanels([...ungrouped.panels, ...removed.panels.map(panel => ({ ...panel, y: y + panel.y! }))], this.dashboard.columns ?? 12)
    return this.serialize(groups.filter(group => group !== removed))
  }

  compacted() {
    return this.serialize(this.groups.map(group => ({ ...group, panels: placePanels(group.panels, this.dashboard.columns ?? 12, true) })))
  }
}
