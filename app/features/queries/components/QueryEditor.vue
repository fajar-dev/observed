<script setup lang="ts">
import { InfluxQueryBuilder } from '#shared/domain/query-builder'
import { starterQuery } from '#shared/domain/query'
import type { QueryRequest } from '#shared/domain/query'
import type { DataSource } from '#shared/domain/data-source'

const props = defineProps<{ source?: DataSource, range: QueryRequest['range'], builder?: boolean }>()
const query = defineModel<string>({ required: true })
const emit = defineEmits<{ run: [] }>()
const mode = ref(query.value.trim() ? 'code' : 'builder')
const measurement = ref('')
const field = ref('')
const aggregation = ref('mean')
const measurements = ref<string[]>([])
const fields = ref<string[]>([])
const tags = ref<{ key: string, value: string }[]>([])
const tagKeys = ref<string[]>([])
const busy = ref(false)
const error = ref('')
const lines = computed(() => Math.max(5, query.value.split('\n').length))
let discovery = 0

function reset() {
  discovery++
  measurement.value = ''
  field.value = ''
  measurements.value = []
  fields.value = []
  tags.value = []
  tagKeys.value = []
  error.value = ''
  busy.value = false
}

watch(() => props.source?.id, () => {
  reset()
  if (mode.value === 'builder' && props.source) void discover('measurement')
})
watch(measurement, () => {
  field.value = ''
  fields.value = []
  if (measurement.value && props.source) void discover('field')
})
watch([measurement, field, aggregation, tags], () => {
  if (mode.value === 'builder') generate()
}, { deep: true })
watch(mode, (value) => {
  if (value === 'builder' && !measurements.value.length && props.source) void discover('measurement')
})
onMounted(() => {
  if (mode.value === 'builder' && props.source) void discover('measurement')
})

async function discover(kind: 'measurement' | 'field') {
  const source = props.source
  if (!source) return
  const request = ++discovery
  const selected = measurement.value
  const statement = new InfluxQueryBuilder(source.queryLanguage).metadata(kind, selected)
  busy.value = true
  error.value = ''
  try {
    const result = await executeQuery({ query: statement, dataSourceId: source.id, range: props.range })
    if (request !== discovery || props.source?.id !== source.id) return
    const values = [...new Set(result.rows.flatMap((row) => {
      const value = row._value ?? row[kind === 'measurement' ? 'name' : 'fieldKey']
      return typeof value === 'string' ? [value] : []
    }))].sort()
    if (kind === 'measurement') measurements.value = values
    else {
      fields.value = values
      const tagResult = await executeQuery({ query: new InfluxQueryBuilder(source.queryLanguage).metadata('tag', selected), dataSourceId: source.id, range: props.range }).catch(() => undefined)
      if (request === discovery && props.source?.id === source.id) tagKeys.value = [...new Set(tagResult?.rows.flatMap(row => typeof (row._value ?? row.tagKey) === 'string' ? [String(row._value ?? row.tagKey)] : []) ?? [])].sort()
    }
    if (!values.length) error.value = 'No values found in this time range. You can also enter a value manually.'
  } catch (failure) {
    if (request === discovery) error.value = apiErrorMessage(failure)
  } finally {
    if (request === discovery) busy.value = false
  }
}

function generate() {
  if (!measurement.value || !field.value || !props.source) return
  query.value = new InfluxQueryBuilder(props.source.queryLanguage).build({ measurement: measurement.value, field: field.value, aggregation: aggregation.value, tags: tags.value })
}

function useStarter() {
  if (props.source) query.value = starterQuery(props.source)
}
</script>

<template>
  <div class="space-y-space-md">
    <div
      v-if="builder"
      class="flex flex-wrap items-center justify-between gap-space-sm"
    >
      <div class="flex items-center gap-space-sm text-xs text-muted">
        <UIcon
          name="i-lucide-database"
          class="size-icon-xs"
        /><span>{{ source?.queryLanguage === 'flux' ? 'Flux' : 'InfluxQL' }}</span>
      </div>
      <UTabs
        v-model="mode"
        :items="[{ label: 'Builder', value: 'builder' }, { label: 'Code', value: 'code' }]"
        :content="false"
        size="xs"
      />
    </div>
    <template v-if="mode === 'builder' && builder && source">
      <RequestError :message="error" />
      <div class="flex flex-wrap gap-space-md">
        <UFormField
          label="FROM"
          class="min-w-field-sm flex-fill"
        >
          <div class="flex gap-space-xs">
            <USelectMenu
              v-model="measurement"
              size="sm"
              :items="measurements"
              create-item
              class="min-w-none flex-fill"
              placeholder="Select measurement"
              :loading="busy"
              @create="measurement = $event"
            />
            <UButton
              size="sm"
              icon="i-lucide-refresh-cw"
              aria-label="Discover measurements"
              color="neutral"
              variant="ghost"
              :disabled="busy"
              @click="discover('measurement')"
            />
          </div>
        </UFormField>
        <UFormField
          label="SELECT"
          class="min-w-field-sm flex-fill"
        >
          <div class="flex gap-space-xs">
            <USelectMenu
              v-model="field"
              size="sm"
              :items="fields"
              create-item
              class="min-w-none flex-fill"
              placeholder="Select field"
              :disabled="!measurement"
              @create="field = $event"
            />
            <UButton
              size="sm"
              icon="i-lucide-refresh-cw"
              aria-label="Discover fields"
              color="neutral"
              variant="ghost"
              :disabled="!measurement || busy"
              @click="discover('field')"
            />
          </div>
        </UFormField>
        <UFormField
          label="AGGREGATE"
          class="min-w-field-sm"
        >
          <USelect
            v-model="aggregation"
            size="sm"
            :items="['raw', 'mean', 'min', 'max', 'sum', 'count', 'last']"
            class="w-full"
          />
        </UFormField>
      </div>
      <div
        v-for="(tag, index) in tags"
        :key="index"
        class="flex items-center gap-space-sm"
      >
        <span class="w-space-page text-xs text-dimmed">{{ index ? 'AND' : 'WHERE' }}</span>
        <USelectMenu
          v-model="tag.key"
          size="sm"
          :items="tagKeys"
          create-item
          placeholder="Tag name"
          aria-label="Tag name"
          class="w-field-sm"
          @create="tag.key = $event"
        />
        <span class="text-muted">=</span>
        <UInput
          v-model="tag.value"
          size="sm"
          placeholder="Tag value"
          aria-label="Tag value"
          class="min-w-none flex-fill"
        />
        <UButton
          size="sm"
          icon="i-lucide-x"
          aria-label="Remove filter"
          color="neutral"
          variant="ghost"
          @click="tags.splice(index, 1)"
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-space-sm">
        <UButton
          size="sm"
          label="Add tag filter"
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          :disabled="tags.length >= 10"
          @click="tags.push({ key: '', value: '' })"
        />
        <UButton
          size="sm"
          label="View generated query"
          icon="i-lucide-code"
          color="neutral"
          variant="ghost"
          :disabled="!query.trim()"
          @click="mode = 'code'"
        />
      </div>
      <p class="text-xs text-dimmed">
        Select a measurement and field to build your query automatically.
      </p>
    </template>
    <div
      v-else
      class="query-code flex overflow-hidden rounded-md border border-default bg-muted"
    >
      <div
        aria-hidden="true"
        class="w-space-xxl shrink-none border-r border-default py-space-sm text-center font-mono text-xs leading-code text-dimmed"
      >
        <div
          v-for="line in Math.min(lines, 20)"
          :key="line"
        >
          {{ line }}
        </div>
      </div>
      <UTextarea
        v-model="query"
        aria-label="Query"
        class="min-w-none flex-fill"
        :ui="{ base: 'rounded-none ring-none focus-visible:ring-none border-none text-sm py-space-sm' }"
        :rows="Math.min(lines, 20)"
        spellcheck="false"
        placeholder="Write a query or switch to Builder…"
        @keydown.meta.enter.prevent="emit('run')"
        @keydown.ctrl.enter.prevent="emit('run')"
      />
    </div>
    <div
      v-if="mode === 'code' || !builder"
      class="flex justify-between gap-space-sm text-xs text-dimmed"
    >
      <UButton
        v-if="!query.trim() && source"
        label="Insert starter query"
        color="neutral"
        variant="link"
        size="xs"
        @click="useStarter"
      />
      <span v-else>{{ query.length.toLocaleString() }} characters</span>
      <span>⌘ / Ctrl + Enter to run</span>
    </div>
  </div>
</template>
