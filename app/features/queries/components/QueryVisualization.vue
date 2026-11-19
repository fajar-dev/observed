<script setup lang="ts">
import type { TimeSeries } from '~/features/queries/utils/visualization'
import type { Panel, PanelOptions } from '#shared/domain/panel'
import type { QueryResponse } from '#shared/domain/query'
import { defaultPanelOptions } from '#shared/domain/panel'
import { fieldAppearance, fieldMetricOptions, formatMetric, formatTableCell, metricColor, reduceValues, toTimeSeries, transformResults } from '~/features/queries/utils/visualization'

const props = withDefaults(defineProps<{ results: QueryResponse[], type: Panel['type'], options?: PanelOptions, compact?: boolean }>(), { compact: false })
const configuration = computed(() => props.options ?? defaultPanelOptions())
const transformed = computed(() => transformResults(props.results, configuration.value))
const rows = computed(() => transformed.value.flatMap(result => result.rows))
const columns = computed(() => [...new Set(transformed.value.flatMap(result => result.columns))])
const tableColumns = computed(() => columns.value.filter(key => !fieldAppearance(key, configuration.value).hideViz).map((key) => {
  const appearance = fieldAppearance(key, configuration.value)
  const alignment = appearance.align ?? configuration.value.tableAlign ?? 'auto'
  const style: Record<string, string> = { ...(appearance.width ? { width: appearance.width + 'px', minWidth: appearance.width + 'px' } : {}), ...(alignment !== 'auto' ? { textAlign: alignment } : {}) }
  return {
    id: key, header: appearance.displayName || key, accessorFn: (row: Record<string, unknown>) => row[key],
    meta: { style: { th: style, td: style } },
    cell: ({ getValue }: { getValue: () => unknown }) => {
      const value = getValue()
      const formatted = formatTableCell(key, value, configuration.value)
      const mode = appearance.cellMode ?? configuration.value.tableCellMode
      const settings = fieldMetricOptions(key, configuration.value)
      const color = typeof value === 'number' ? metricColor(value, settings) : undefined
      const percentage = typeof value === 'number' ? Math.max(0, Math.min(100, (value - (settings.min ?? 0)) / ((settings.max ?? 100) - (settings.min ?? 0) || 1) * 100)) : 0
      return h('span', { title: formatted, class: 'block rounded-sm px-space-xs', style: {
        color: mode === 'color-text' ? color : undefined,
        backgroundColor: mode === 'color-background' && color ? color + '30' : undefined,
        backgroundImage: mode === 'gauge' && color ? `linear-gradient(to right, ${color}40 ${percentage}%, transparent ${percentage}%)` : undefined
      } }, formatted)
    }
  }
}))
const series = computed(() => toTimeSeries(transformed.value, configuration.value.displayName, configuration.value))
const statistics = computed(() => series.value.map(item => ({ ...item, value: reduceValues(item, configuration.value.reducer), settings: fieldMetricOptions(item.field, configuration.value) })))
const hasTime = computed(() => columns.value.includes('_time') || columns.value.includes('time'))
const timeRange = computed(() => props.results.find(result => result.timeRange)?.timeRange)
function gaugePercent(value: number, settings = configuration.value) {
  const min = settings.min ?? 0
  const max = settings.max ?? (settings.unit === 'percentRatio' ? 1 : 100)
  return Math.max(0, Math.min(100, (value - min) / (max - min || 1) * 100))
}
function sparklinePoints(item: TimeSeries) {
  const values = item.points.map(point => point.y)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return item.points.map((point, index) => `${index / Math.max(1, item.points.length - 1) * 100},${90 - (point.y - min) / (max - min || 1) * 70}`).join(' ')
}
</script>

<template>
  <div
    class="query-visualization flex min-h-none min-w-none flex-col"
    :class="compact ? 'h-full flex-fill' : 'min-h-modal'"
    :style="compact ? { containerType: 'size' } : undefined"
  >
    <div
      v-if="type === 'text'"
      class="min-h-none flex-fill overflow-auto p-space-md text-sm leading-loose whitespace-pre-wrap"
    >
      {{ configuration.text || 'Add text in the panel options.' }}
    </div>
    <UEmpty
      v-else-if="!rows.length"
      icon="i-lucide-chart-no-axes-combined"
      title="No data"
      description="Run a query or adjust the time range."
      size="sm"
      class="min-h-none flex-fill overflow-auto"
    />
    <template v-else>
      <div
        v-if="type === 'table'"
        class="visualization-table min-h-none flex-fill overflow-auto"
        :class="compact ? '' : 'max-h-modal'"
      >
        <UTable
          :data="rows.slice(0, 500)"
          :columns="tableColumns"
          class="min-w-full"
          :ui="{ root: 'overflow-visible', thead: configuration.tableShowHeader === false ? 'hidden' : '', th: 'bg-default px-space-md py-space-sm text-xs whitespace-nowrap', td: 'px-space-md text-xs whitespace-nowrap ' + (configuration.tableCellHeight === 'lg' ? 'py-space-lg' : configuration.tableCellHeight === 'md' ? 'py-space-md' : 'py-space-sm') }"
          sticky
        />
      </div>
      <UEmpty
        v-else-if="!series.length"
        title="No numeric fields"
        description="Use a table to inspect these results."
        icon="i-lucide-table-2"
        size="sm"
        class="min-h-none flex-fill overflow-auto"
      />
      <div
        v-else-if="type === 'stat'"
        class="stat-grid grid min-h-none flex-fill items-center gap-space-md overflow-auto py-space-xs"
        :style="{ gridTemplateColumns: `repeat(${Math.min(statistics.length, 3)}, minmax(0, 1fr))` }"
      >
        <div
          v-for="item in statistics"
          :key="item.id ?? item.label"
          class="relative min-w-none overflow-hidden rounded-sm px-space-xs text-center"
          :class="statistics.length === 1 ? 'flex h-full flex-col justify-center' : 'py-space-sm'"
          :style="{ containerType: 'inline-size', backgroundColor: configuration.statColorMode === 'background' ? metricColor(item.value, item.settings) + '25' : undefined }"
        >
          <svg
            v-if="configuration.statGraphMode === 'area' && item.points.length > 1"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            class="pointer-events-none absolute inset-none h-full w-full opacity-soft"
          >
            <polygon
              :points="'0,100 ' + sparklinePoints(item) + ' 100,100'"
              :fill="metricColor(item.value, item.settings)"
            />
          </svg>
          <p
            v-if="configuration.statTextMode !== 'name' && configuration.statTextMode !== 'none'"
            class="relative font-semibold leading-tight tracking-tight"
            :class="compact ? (statistics.length === 1 ? 'metric-value whitespace-nowrap' : 'text-title whitespace-nowrap') : 'text-display'"
            :style="{ 'color': configuration.statColorMode === 'none' ? 'var(--ui-text-highlighted)' : metricColor(item.value, item.settings), '--metric-length': Math.max(1, formatMetric(item.value, item.settings).length) }"
          >
            {{ formatMetric(item.value, item.settings) }}
          </p>
          <p
            v-if="!['value', 'none'].includes(configuration.statTextMode ?? 'auto') && (statistics.length > 1 || configuration.displayName || ['name', 'value_and_name'].includes(configuration.statTextMode ?? 'auto'))"
            class="stat-label mt-space-sm max-w-sidebar truncate text-xs text-muted"
            :title="item.label"
          >
            {{ item.label }}
          </p>
        </div>
      </div>
      <div
        v-else-if="type === 'bargauge'"
        class="flex min-h-none flex-fill flex-col gap-space-lg overflow-auto py-space-sm"
      >
        <div
          v-for="item in statistics"
          :key="item.id ?? item.label"
        >
          <div class="mb-space-xs flex justify-between gap-space-md text-xs">
            <span
              class="truncate text-muted"
              :title="item.label"
            >{{ item.label }}</span><span class="shrink-none font-medium text-highlighted">{{ formatMetric(item.value, item.settings) }}</span>
          </div>
          <div class="h-space-lg overflow-hidden rounded-sm bg-elevated">
            <div
              class="h-full rounded-sm"
              :style="{ width: gaugePercent(item.value, item.settings) + '%', backgroundColor: metricColor(item.value, item.settings) }"
            />
          </div>
        </div>
      </div>
      <div
        v-else-if="type === 'gauge'"
        class="gauge-grid grid min-h-none flex-fill items-center justify-items-center gap-space-md overflow-auto"
        :style="{ gridTemplateColumns: `repeat(${Math.min(statistics.length, 3)}, minmax(0, 1fr))` }"
      >
        <div
          v-for="item in statistics"
          :key="item.id ?? item.label"
          class="w-full min-w-none max-w-field text-center"
        >
          <svg
            viewBox="0 0 200 120"
            class="max-h-gauge w-full"
            role="img"
            :aria-label="item.label + ' gauge'"
          >
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--ui-bg-elevated)"
              stroke-width="14"
              pathLength="100"
            />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              :stroke="metricColor(item.value, item.settings)"
              stroke-width="14"
              pathLength="100"
              :stroke-dasharray="gaugePercent(item.value, item.settings) + ' 100'"
            />
            <text
              x="100"
              y="100"
              text-anchor="middle"
              fill="var(--ui-text-highlighted)"
              font-weight="600"
              :font-size="Math.min(25, 230 / Math.max(1, formatMetric(item.value, item.settings).length))"
            >{{ formatMetric(item.value, item.settings) }}</text>
          </svg>
          <p
            class="truncate text-xs text-muted"
            :title="item.label"
          >
            {{ item.label }}
          </p>
        </div>
      </div>
      <QueryChart
        v-else
        :series="series"
        :type="type"
        :options="configuration"
        :has-time="hasTime"
        :time-range="timeRange"
        :class="compact ? 'flex-fill' : 'h-modal'"
      />
    </template>
    <p
      v-if="compact && results.some(result => result.truncated)"
      class="mt-space-xs shrink-none text-xs text-warning"
    >
      Query limit reached · Narrow the time range or aggregate the query.
    </p>

    <p
      v-else-if="compact && type === 'table' && rows.length > 500"
      class="mt-space-xs shrink-none text-xs text-dimmed"
    >
      Showing first 500 of {{ rows.length.toLocaleString() }} rows
    </p>

    <p
      v-if="!compact && type !== 'text' && results.length"
      class="mt-space-md shrink-none text-xs text-dimmed"
    >
      {{ rows.length.toLocaleString() }} rows · {{ results.reduce((sum, result) => sum + result.duration, 0) }} ms
      <span v-if="type === 'table' && rows.length > 500"> · Showing first 500 rows</span>
      <span
        v-if="results.some(result => result.truncated)"
        class="text-warning"
      > · Query limit reached</span>
      <span
        v-if="series.length >= 24"
        class="text-warning"
      > · Showing up to 24 series</span>
    </p>
  </div>
</template>
