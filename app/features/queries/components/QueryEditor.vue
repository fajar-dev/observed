<script setup lang="ts">
import type { QueryRequest } from '#shared/domain/query'
import type { DataSource } from '#shared/domain/data-source'

const props = defineProps<{ source?: DataSource, range: QueryRequest['range'], builder?: boolean }>()
const query = defineModel<string>({ required: true })
const emit = defineEmits<{ run: [] }>()
const { mode, measurement, field, aggregation, measurements, fields, tags, tagKeys, busy, error, lines, discover, useStarter } = useQueryBuilder(props, query)
useErrorToast(error, 'Could not load query fields')
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
      />
    </div>
    <template v-if="mode === 'builder' && builder && source">
      <div class="flex flex-wrap gap-space-md">
        <UFormField
          label="FROM"
          class="min-w-field-sm flex-fill"
        >
          <div class="flex gap-space-xs">
            <USelectMenu
              v-model="measurement"
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
            placeholder="Select aggregation"
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
        Choose a measurement and field.
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
      <span v-else>{{ query.length.toLocaleString('en') }} characters</span>
      <span>⌘ / Ctrl + Enter to run</span>
    </div>
  </div>
</template>
