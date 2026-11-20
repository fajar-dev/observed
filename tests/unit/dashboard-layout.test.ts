import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { DashboardLayout } from '#shared/utils/dashboard-layout'
import { dashboardSchema } from '#shared/domain/dashboard'
import type { DashboardDefinition } from '#shared/domain/dashboard'
import type { Panel } from '#shared/domain/panel'

function fixture(): DashboardDefinition {
  const first = randomUUID(), second = randomUUID()
  const panel = (title: string, x: number, y: number, span = 6, height = 5): Panel => ({ id: randomUUID(), title, x, y, span, height, type: 'stat', dataSourceId: null, query: 'cpu', additionalQueries: [] })
  return { name: 'Infrastructure', description: '', range: '1h', refresh: 0, columns: 24, sections: [{ id: first, title: 'Hosts', y: 0 }, { id: second, title: 'VMs', y: 6, collapsed: true }], panels: [panel('CPU', 0, 1), panel('Memory', 6, 1), panel('VM CPU', 0, 7)] }
}

test('imported global coordinates resolve into row-local geometry and stable explicit membership', () => {
  const original = fixture(), layout = new DashboardLayout(original)
  const groups = layout.groups
  assert.equal(groups[1]!.panels.length, 2)
  assert.equal(groups[1]!.panels[0]!.y, 0)
  assert.equal(groups[2]!.panels[0]!.y, 0)
  const normalized = layout.normalized()
  assert.equal(normalized.sections![1]!.collapsed, true)
  assert.deepEqual(new DashboardLayout(normalized).normalized(), normalized)
  assert.deepEqual(dashboardSchema.parse(normalized), normalized)
  assert.equal(original.panels[0]!.sectionId, undefined, 'Layout operations must not mutate saved state')
})

test('resizing a panel expands its row and moves later rows without moving their local panels', () => {
  const dashboard = fixture(), id = dashboard.panels[0]!.id
  const updated = new DashboardLayout(dashboard).withLayout(dashboard.sections![0]!.id, [{ id, x: 0, y: 2, span: 6, height: 12 }])
  assert.equal(updated.panels.find(panel => panel.id === id)!.height, 12)
  assert.equal(updated.sections![1]!.y, 15)
  assert.equal(new DashboardLayout(updated).groups[2]!.panels[0]!.y, 0)
})

test('moving and removing rows preserves all panels and their group membership', () => {
  const dashboard = fixture()
  const moved = new DashboardLayout(dashboard).withSectionMoved(dashboard.sections![1]!.id, -1)
  assert.equal(moved.sections![0]!.title, 'VMs')
  assert.equal(new DashboardLayout(moved).groups[1]!.panels[0]!.title, 'VM CPU')
  const removed = new DashboardLayout(moved).withoutSection(dashboard.sections![0]!.id)
  assert.equal(removed.sections!.length, 1)
  assert.equal(removed.panels.length, dashboard.panels.length)
  assert.equal(new DashboardLayout(removed).groups[0]!.panels.length, 2)
  assert.equal(new DashboardLayout(removed).groups[1]!.panels[0]!.title, 'VM CPU')
})

test('panels move between rows or outside them and explicit ungrouped panels do not join imported rows', () => {
  const dashboard = fixture(), id = dashboard.panels[0]!.id, second = dashboard.sections![1]!.id
  const moved = new DashboardLayout(dashboard).withPanelMoved(id, second)
  assert.equal(new DashboardLayout(moved).groups[2]!.panels.length, 2)
  const ungrouped = new DashboardLayout(moved).withPanelMoved(id, null)
  assert.equal(ungrouped.panels.find(panel => panel.id === id)!.sectionId, null)
  assert.equal(new DashboardLayout(ungrouped).groups[0]!.panels[0]!.id, id)
  assert.equal(new DashboardLayout(ungrouped).normalized().panels.length, 3)
})

test('compact layout removes empty space and packs panels without overlaps, including odd widths', () => {
  const dashboard = fixture()
  dashboard.panels[0]!.span = 7
  dashboard.panels[1]!.x = 12
  dashboard.panels[1]!.y = 30
  dashboard.panels[1]!.sectionId = dashboard.sections![0]!.id
  const compacted = new DashboardLayout(dashboard).compacted()
  const panels = new DashboardLayout(compacted).groups[1]!.panels
  assert.equal(panels[0]!.span, 7)
  assert.equal(panels[1]!.x, 7)
  assert.equal(panels[1]!.y, 0)
  assert.equal(compacted.sections![1]!.y, 6)
})
