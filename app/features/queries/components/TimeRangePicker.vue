<script setup lang="ts">
import { queryWindow } from '#shared/utils/query-interpolation'
import { ranges } from '#shared/domain/query'
import type { QueryRequest } from '#shared/domain/query'

const range = defineModel<QueryRequest['range']>({ required: true })
const from = defineModel<string | undefined>('from')
const to = defineModel<string | undefined>('to')
const open = ref(false)
const start = ref('')
const stop = ref('')
const error = ref('')
const label = computed(() => from.value && to.value
  ? new Date(from.value).toLocaleString() + ' — ' + new Date(to.value).toLocaleString()
  : ranges.find(item => item.value === range.value)?.label ?? 'Time range')
function localDateTime(value: string) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 19)
}
watch(open, (value) => {
  if (!value) return
  error.value = ''
  const window = queryWindow({ range: range.value, from: from.value, to: to.value })
  start.value = localDateTime(window.start)
  stop.value = localDateTime(window.stop)
})
function relative(value: QueryRequest['range']) {
  range.value = value
  from.value = undefined
  to.value = undefined
  open.value = false
}
function absolute() {
  error.value = ''
  const first = new Date(start.value).getTime()
  const last = new Date(stop.value).getTime()
  if (!Number.isFinite(first) || !Number.isFinite(last) || first >= last) {
    error.value = 'Select a start time before the end time.'
    return
  }
  if (last - first > 366 * 86400_000) {
    error.value = 'Choose a range within 366 days.'
    return
  }
  from.value = new Date(first).toISOString()
  to.value = new Date(last).toISOString()
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      size="sm"
      :label="label"
      :title="label"
      icon="i-lucide-clock-3"
      trailing-icon="i-lucide-chevron-down"
      color="neutral"
      variant="outline"
      aria-label="Time range"
      class="min-w-none max-w-field flex-fill truncate"
    />
    <template #content>
      <div class="grid w-time-picker gap-none sm:grid-cols-pair">
        <div class="border-b border-default p-space-lg sm:border-r sm:border-b-0">
          <p class="mb-space-md font-medium text-highlighted">
            Absolute time range
          </p>
          <div class="space-y-space-md">
            <UFormField label="From">
              <UInput
                v-model="start"
                placeholder="Start date and time"
                type="datetime-local"
                step="1"
                class="w-full"
              />
            </UFormField>
            <UFormField label="To">
              <UInput
                v-model="stop"
                placeholder="End date and time"
                type="datetime-local"
                step="1"
                class="w-full"
              />
            </UFormField>
            <p
              v-if="error"
              class="text-xs text-error"
            >
              {{ error }}
            </p>
            <UButton
              size="sm"
              label="Apply time range"
              @click="absolute"
            />
          </div>
        </div>
        <div class="p-space-sm">
          <p class="px-space-sm py-space-sm text-xs text-dimmed">
            Relative time ranges
          </p>
          <button
            v-for="option in [...ranges].sort((a, b) => a.seconds - b.seconds)"
            :key="option.value"
            class="flex w-full cursor-pointer items-center justify-between rounded-md px-space-md py-space-sm text-left text-sm hover:bg-elevated"
            :class="range === option.value && !from ? 'bg-primary-soft text-primary' : 'text-default'"
            @click="relative(option.value)"
          >
            {{ option.label }}<UIcon
              v-if="range === option.value && !from"
              name="i-lucide-check"
              class="size-icon-sm"
            />
          </button>
          <p class="mt-space-xs border-t border-default px-space-md pt-space-sm text-xs text-dimmed">
            Browser timezone · {{ Intl.DateTimeFormat().resolvedOptions().timeZone }}
          </p>
        </div>
      </div>
    </template>
  </UPopover>
</template>
