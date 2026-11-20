<script setup lang="ts">
import type { Panel } from '#shared/domain/panel'
import { visualizationCatalog } from '#shared/domain/panel'

const draft = defineModel<Panel>({ required: true })
const options = computed(() => draft.value.options!)
const visualizationOpen = ref(false)
const visualizationSearch = ref('')
const selectedVisualization = computed(() => visualizationCatalog.find(item => item.value === draft.value.type))
function numberOption(key: 'min' | 'max', value: unknown) {
  options.value[key] = value === '' || value === null || value === undefined ? undefined : Number(value)
}
</script>

<template>
  <aside class="border-l border-default bg-default">
    <div class="space-y-space-lg p-space-lg">
      <UPopover
        v-model:open="visualizationOpen"
        :content="{ side: 'left', align: 'start' }"
      >
        <UButton
          size="sm"
          :label="selectedVisualization?.label"
          :icon="selectedVisualization?.icon"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="outline"
          block
          class="justify-start py-space-md text-sm"
          aria-label="Select visualization"
        />
        <template #content>
          <div class="w-popover max-w-full p-space-md">
            <UInput
              v-model="visualizationSearch"
              size="sm"
              placeholder="Search visualizations"
              icon="i-lucide-search"
              class="mb-space-md w-full"
            /><button
              v-for="item in visualizationCatalog.filter(item => item.label.toLowerCase().includes(visualizationSearch.toLowerCase()))"
              :key="item.value"
              class="flex w-full cursor-pointer items-center gap-space-md rounded-md p-space-sm text-left hover:bg-elevated"
              :class="draft.type === item.value ? 'bg-primary-soft text-primary' : ''"
              @click="draft.type = item.value; visualizationOpen = false"
            >
              <UIcon
                :name="item.icon"
                class="size-icon-lg"
              /><span><span class="block text-sm">{{ item.label }}</span><span class="block text-xs text-muted">{{ item.description }}</span></span>
            </button>
          </div>
        </template>
      </UPopover>
      <section class="space-y-space-md border-t border-default pt-space-lg">
        <h3 class="text-sm font-semibold text-highlighted">
          Panel options
        </h3>
        <UFormField label="Title">
          <UInput
            v-model="draft.title"
            size="sm"
            aria-label="Panel title"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Description">
          <UTextarea
            v-model="draft.note"
            class="w-full"
            :rows="2"
          />
        </UFormField>
        <UFormField
          v-if="draft.type === 'text'"
          label="Text content"
        >
          <UTextarea
            v-model="options.text"
            :rows="8"
            class="w-full"
          />
        </UFormField>
      </section>
      <section
        v-if="draft.type !== 'text'"
        class="space-y-space-md border-t border-default pt-space-lg"
      >
        <h3 class="text-sm font-semibold text-highlighted">
          Standard options
        </h3>
        <UFormField label="Unit">
          <USelect
            v-model="options.unit"
            size="sm"
            :items="[...(options.unit && !['none', 'percent', 'percentRatio', 'decimalBytes', 'gigabytes', 'bytesPerSecond', 'bytes', 'seconds', 'milliseconds', 'celsius', 'requests'].includes(options.unit) ? [{ label: options.unit, value: options.unit }] : []), { label: 'None', value: 'none' }, { label: 'Percent (0–100)', value: 'percent' }, { label: 'Percent (0–1)', value: 'percentRatio' }, { label: 'Bytes (decimal)', value: 'decimalBytes' }, { label: 'GiB', value: 'gigabytes' }, { label: 'Bytes / second', value: 'bytesPerSecond' }, { label: 'Bytes (IEC)', value: 'bytes' }, { label: 'Seconds', value: 'seconds' }, { label: 'Milliseconds', value: 'milliseconds' }, { label: 'Celsius', value: 'celsius' }, { label: 'Requests / second', value: 'requests' }]"
            class="w-full"
          />
        </UFormField>
        <div class="grid grid-cols-pair gap-space-sm">
          <UFormField label="Min">
            <UInput
              size="sm"
              :model-value="options.min"
              type="number"
              placeholder="Auto"
              class="w-full"
              @update:model-value="numberOption('min', $event)"
            />
          </UFormField><UFormField label="Max">
            <UInput
              size="sm"
              :model-value="options.max"
              type="number"
              placeholder="Auto"
              class="w-full"
              @update:model-value="numberOption('max', $event)"
            />
          </UFormField>
        </div>
        <UFormField label="Decimals">
          <UInput
            v-model.number="options.decimals"
            size="sm"
            type="number"
            :min="0"
            :max="8"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Calculation">
          <USelect
            v-model="options.reducer"
            size="sm"
            :items="['last', 'mean', 'min', 'max', 'sum', 'count']"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Series color">
          <div class="flex items-center gap-space-md">
            <ColorField
              v-model="options.color"
              label="Series color"
              @change="options.colorMode = ['stat', 'gauge', 'bargauge'].includes(draft.type) ? 'thresholds' : 'fixed'"
            />
          </div>
        </UFormField>
        <USwitch
          v-model="options.legend"
          label="Show legend"
          size="sm"
        />
        <template v-if="options.legend && ['line', 'area', 'bar', 'pie'].includes(draft.type)">
          <UFormField label="Legend placement">
            <USelect
              v-model="options.legendPlacement"
              size="sm"
              :items="['bottom', 'right']"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Legend display">
            <USelect
              v-model="options.legendMode"
              size="sm"
              :items="['list', 'table']"
              class="w-full"
            />
          </UFormField>
          <UFormField
            v-if="options.legendMode === 'table'"
            label="Legend calculations"
          >
            <USelect
              v-model="options.legendCalculations"
              size="sm"
              :items="['last', 'mean', 'min', 'max', 'sum', 'count']"
              multiple
              class="w-full"
            />
          </UFormField>
        </template>
        <UFormField
          v-if="['line', 'area'].includes(draft.type)"
          label="Line width"
        >
          <USlider
            v-model="options.lineWidth"
            :min="0"
            :max="6"
          />
        </UFormField>
        <UFormField
          v-if="draft.type === 'area'"
          label="Fill opacity"
        >
          <USlider
            v-model="options.fill"
            :min="0"
            :max="100"
          />
        </UFormField>
      </section>
      <section
        v-if="['stat', 'gauge', 'bargauge'].includes(draft.type)"
        class="space-y-space-md border-t border-default pt-space-lg"
      >
        <h3 class="text-sm font-semibold text-highlighted">
          Thresholds
        </h3>
        <div
          v-for="(threshold, index) in options.thresholds"
          :key="index"
          class="flex gap-space-sm"
        >
          <ColorField
            v-model="threshold.color"
            label="Threshold color"
          /><UButton
            size="sm"
            icon="i-lucide-x"
            aria-label="Remove threshold"
            color="neutral"
            variant="ghost"
            @click="options.thresholds.splice(index, 1)"
          />
        </div>
        <UButton
          size="sm"
          label="Add threshold"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          :disabled="options.thresholds.length >= 10"
          @click="options.thresholds.push({ value: 80, color: '#f2495c' })"
        />
      </section>
    </div>
  </aside>
</template>
