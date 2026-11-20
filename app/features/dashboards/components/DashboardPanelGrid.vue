<script setup lang="ts">
import type { GridStack, GridStackNode } from 'gridstack'
import type { Panel } from '#shared/domain/panel'
import type { QueryRequest } from '#shared/domain/query'

const props = defineProps<{ columns?: 12 | 24, panels: Panel[], editing: boolean, kiosk?: boolean, range: QueryRequest['range'], from?: string, to?: string, sections?: import('#shared/domain/dashboard').DashboardSection[], sectionId?: string | null, variables?: import('#shared/domain/variable').VariableValues, refresh: number }>()
const emit = defineEmits<{ layout: [changes: { id: string, x: number, y: number, span: number, height: number }[]], edit: [panel: Panel], remove: [panel: Panel], duplicate: [panel: Panel], move: [panel: Panel, sectionId: string | null] }>()
const element = ref<HTMLDivElement>()
let grid: GridStack | undefined
let alive = true
let synchronizing = false
let resizeObserver: ResizeObserver | undefined
const positions = computed(() => props.panels.map(panel => ({ x: panel.x ?? 0, y: panel.y ?? 0, w: panel.span, h: panel.height ?? 5 })))

onMounted(async () => {
  const { GridStack } = await import('gridstack')
  if (!alive || !element.value) return
  grid = GridStack.init({
    column: props.columns ?? 12, cellHeight: props.columns === 24 ? 38 : 65, margin: props.columns === 24 ? 4 : 6, mode: 'float', handle: '.panel-drag-handle',
    disableDrag: !props.editing, disableResize: !props.editing,
    columnOpts: { columnMax: props.columns ?? 12, breakpoints: [{ w: 700, c: 1 }] },
    alwaysShowResizeHandle: false, resizable: { handles: 'se' }, acceptWidgets: false
  }, element.value) ?? undefined
  const updateEditing = () => {
    const enabled = props.editing && grid?.getColumn() === (props.columns ?? 12)
    grid?.enableMove(enabled)
    grid?.enableResize(enabled)
  }
  resizeObserver = new ResizeObserver(updateEditing)
  resizeObserver.observe(element.value)
  updateEditing()
  grid?.on('change', (_event: Event, nodes: GridStackNode[]) => {
    if (synchronizing || !props.editing || grid?.getColumn() !== (props.columns ?? 12)) return
    emit('layout', nodes.flatMap(node => node.id && props.panels.some(panel => panel.id === node.id) ? [{ id: node.id, x: node.x ?? 0, y: node.y ?? 0, span: node.w ?? 6, height: node.h ?? 5 }] : []))
  })
})
watch(() => props.editing, (value) => {
  const enabled = value && grid?.getColumn() === (props.columns ?? 12)
  grid?.enableMove(enabled)
  grid?.enableResize(enabled)
})
watch(() => props.panels.map(panel => [panel.id, panel.x, panel.y, panel.span, panel.height]), async () => {
  await nextTick()
  if (!grid || !element.value) return
  synchronizing = true
  grid.batchUpdate()
  const ids = new Set([...props.panels.map(panel => panel.id)])
  grid.engine.nodes.filter(node => node.id && !ids.has(node.id)).forEach((node) => {
    if (node.el) grid?.removeWidget(node.el, false, false)
  })
  element.value.querySelectorAll<HTMLElement>('.grid-stack-item').forEach((element) => {
    const node = (element as HTMLElement & { gridstackNode?: GridStackNode }).gridstackNode
    if (!node) {
      grid?.makeWidget(element)
      return
    }
    const position = positions.value[props.panels.findIndex(panel => panel.id === node.id)]
    if (grid?.getColumn() === (props.columns ?? 12) && position && (node.x !== position.x || node.y !== position.y || node.w !== position.w || node.h !== position.h)) grid.update(element, position)
  })
  grid.batchUpdate(false)
  synchronizing = false
})
onBeforeUnmount(() => {
  alive = false
  resizeObserver?.disconnect()
  grid?.destroy(false)
})
</script>

<template>
  <div
    ref="element"
    class="grid-stack min-h-compact"
    :data-editing="editing"
  >
    <div
      v-for="(panel, index) in panels"
      :key="panel.id"
      class="grid-stack-item"
      :data-panel-id="panel.id"
      :gs-id="panel.id"
      :gs-x="positions[index]?.x"
      :gs-y="positions[index]?.y"
      :gs-w="panel.span"
      :gs-h="panel.height ?? 5"
      gs-min-w="1"
      gs-min-h="2"
      :gs-max-w="columns ?? 12"
      gs-max-h="100"
    >
      <div class="grid-stack-item-content">
        <DashboardPanel
          :panel="panel"
          :range="range"
          :from="from"
          :to="to"
          :variables="variables"
          :refresh="refresh"
          :editing="editing"
          :kiosk="kiosk"
          :sections="sections"
          :section-id="sectionId"
          @edit="emit('edit', panel)"
          @remove="emit('remove', panel)"
          @duplicate="emit('duplicate', panel)"
          @move="sectionId => emit('move', panel, sectionId)"
        />
      </div>
    </div>
  </div>
</template>
