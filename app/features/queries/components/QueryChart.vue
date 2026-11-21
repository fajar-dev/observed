<script setup lang="ts">
import type { PanelOptions } from '#shared/domain/panel'
import type { QueryResponse } from '#shared/domain/query'
import type { TimeSeries } from '~/features/queries/utils/visualization'
import { fieldAppearance, fieldMetricOptions, formatMetric, reduceValues, seriesColor } from '~/features/queries/utils/visualization'
import { buildChartDefinition, seriesKey } from '~/features/queries/utils/chart-definition'

const props = defineProps<{ series: TimeSeries[], type: 'line' | 'area' | 'bar' | 'pie', options: PanelOptions, hasTime: boolean, timeRange?: QueryResponse['timeRange'] }>()
const plot = ref<HTMLDivElement>()
const frame = ref<HTMLDivElement>()
const frameWidth = ref(600)
const hidden = ref<string[]>([])
const size = ref({ width: 600, height: 250 })
const colors = computed(() => props.series.map((item, index) => seriesColor(item, index, props.options)))
const legendSeries = computed(() => props.series.map((item, index) => ({ ...item, index })).filter(item => !fieldAppearance(item.field, props.options).hideLegend))
const visible = computed(() => props.series.filter(item => !hidden.value.includes(seriesKey(item))))
const visibleColors = computed(() => visible.value.map(item => colors.value[props.series.findIndex(original => seriesKey(original) === seriesKey(item))]!))
const definition = computed(() => props.type === 'pie' ? undefined : buildChartDefinition(visible.value, props.type, props.options, props.hasTime, props.timeRange, size.value, visibleColors.value))
const pieRows = computed(() => visible.value.map(item => ({ label: item.label, value: Math.max(0, reduceValues(item, props.options.reducer)) })))
const rightLegend = computed(() => props.options.legendPlacement === 'right' && frameWidth.value >= 560)
const calculationLabels = { last: 'Last', mean: 'Mean', min: 'Min', max: 'Max', sum: 'Total', count: 'Count' }
function toggle(key: string) {
  hidden.value = hidden.value.includes(key) ? hidden.value.filter(item => item !== key) : [...hidden.value, key]
}
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === frame.value) frameWidth.value = Math.round(entry.contentRect.width)
      if (entry.target === plot.value) size.value = { width: Math.max(1, Math.round(entry.contentRect.width)), height: Math.max(1, Math.round(entry.contentRect.height)) }
    }
  })
  if (plot.value) observer.observe(plot.value)
  if (frame.value) observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    ref="frame"
    class="query-chart flex min-h-none min-w-none gap-space-sm"
    :class="rightLegend ? 'flex-row' : 'flex-col'"
  >
    <div
      ref="plot"
      class="chart-plot relative min-h-none min-w-none flex-fill text-muted"
    >
      <UChart
        v-if="type === 'pie'"
        type="donut"
        :data="pieRows"
        index="label"
        :categories="['value']"
        :colors="visibleColors"
        :legend="false"
        :height="size.height"
        :format="value => formatMetric(value, options)"
        aria-label="Pie chart of query results"
      />
      <UChart
        v-else
        :definition="definition"
        :height="size.height"
        :legend="false"
        :aria-label="type + ' chart of query results'"
      >
        <template #tooltip="{ points }">
          <div class="max-w-summary space-y-space-xs text-sm">
            <p
              v-if="hasTime && points[0]"
              class="font-semibold text-highlighted"
            >
              {{ new Date(Number(points[0].xValue)).toLocaleString('en') }}
            </p>
            <div
              v-for="(point, index) in points.filter(point => !fieldAppearance(point.datum.field, options).hideTooltip)"
              :key="index"
              class="flex items-center gap-space-sm"
            >
              <span
                class="size-indicator shrink-none rounded-full"
                :style="{ backgroundColor: point.color }"
              />
              <span class="truncate">{{ point.datum.label }}</span><span class="ml-auto shrink-none font-semibold">{{ formatMetric(Number(point.datum.value ?? point.yValue), fieldMetricOptions(point.datum.field, options)) }}</span>
            </div>
          </div>
        </template>
      </UChart>
    </div>
    <div
      v-if="options.legend"
      class="chart-legend min-h-none min-w-none shrink-none overflow-auto"
      :class="rightLegend ? 'max-h-full' : 'max-h-legend'"
      :style="rightLegend ? { width: `min(40%, ${options.legendWidth ?? 240}px)` } : undefined"
      role="group"
      aria-label="Chart series"
    >
      <table
        v-if="options.legendMode === 'table'"
        class="w-full border-collapse text-xs"
      >
        <thead class="sticky top-none bg-default text-dimmed">
          <tr>
            <th class="px-space-xs pb-space-xs text-left font-normal">
              Name
            </th><th
              v-for="calc in options.legendCalculations ?? []"
              :key="calc"
              class="px-space-sm pb-space-xs text-right font-normal whitespace-nowrap"
            >
              {{ calculationLabels[calc] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in legendSeries"
            :key="seriesKey(item)"
          >
            <td class="max-w-none px-space-xs py-space-xxs">
              <button
                type="button"
                class="flex w-full min-w-none items-center gap-space-sm text-left text-muted hover:text-highlighted"
                :title="item.label"
                :aria-pressed="!hidden.includes(seriesKey(item))"
                @click="toggle(seriesKey(item))"
              >
                <span
                  class="h-space-xxs w-space-md shrink-none"
                  :style="{ backgroundColor: colors[item.index] }"
                />
                <span
                  class="truncate"
                  :class="hidden.includes(seriesKey(item)) ? 'line-through opacity-muted' : ''"
                >{{ item.label }}</span>
              </button>
            </td>
            <td
              v-for="calc in options.legendCalculations ?? []"
              :key="calc"
              class="px-space-sm py-space-xxs text-right text-muted tabular-nums whitespace-nowrap"
            >
              {{ formatMetric(reduceValues(item, calc), fieldMetricOptions(item.field, options)) }}
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-else
        class="flex flex-wrap gap-x-space-lg gap-y-space-xs px-space-xs pb-space-xs"
        :class="rightLegend ? 'justify-start' : 'justify-center'"
      >
        <button
          v-for="item in legendSeries"
          :key="seriesKey(item)"
          type="button"
          class="flex min-w-none max-w-full items-center gap-space-sm rounded-md px-space-xs py-space-xxs text-left text-xs text-muted hover:bg-elevated focus-visible:outline-medium focus-visible:outline-primary"
          :class="hidden.includes(seriesKey(item)) ? 'opacity-muted' : ''"
          :title="item.label"
          :aria-pressed="!hidden.includes(seriesKey(item))"
          @click="toggle(seriesKey(item))"
        >
          <span
            class="h-space-xxs w-space-md shrink-none"
            :style="{ backgroundColor: colors[item.index] }"
          />
          <span
            class="truncate"
            :class="hidden.includes(seriesKey(item)) ? 'line-through' : ''"
          >{{ item.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
