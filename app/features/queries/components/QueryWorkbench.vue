<script setup lang="ts">
import type { QueryRequest } from '#shared/domain/query'
import type { DataSource } from '#shared/domain/data-source'

const props = defineProps<{ source?: DataSource, range: QueryRequest['range'] }>()
const queries = defineModel<string[]>({ required: true })
defineEmits<{ run: [] }>()
const collapsed = ref<number[]>([])
function update(index: number, value: string) {
  queries.value = queries.value.map((query, position) => index === position ? value : query)
}
function remove(index: number) {
  queries.value = queries.value.filter((_query, position) => position !== index)
  collapsed.value = []
}
</script>

<template>
  <div class="space-y-space-md">
    <section
      v-for="(query, index) in queries"
      :key="index"
      class="surface overflow-hidden"
    >
      <header class="flex items-center justify-between border-b border-default bg-elevated-muted px-space-md py-space-sm">
        <button
          type="button"
          class="flex min-w-none cursor-pointer items-center gap-space-sm"
          :aria-expanded="!collapsed.includes(index)"
          :aria-label="'Toggle query ' + String.fromCharCode(65 + index)"
          @click="collapsed = collapsed.includes(index) ? collapsed.filter(item => item !== index) : [...collapsed, index]"
        >
          <UIcon
            :name="collapsed.includes(index) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            class="size-icon-xs text-muted"
          />
          <span class="grid size-icon-md place-items-center rounded-md bg-primary-soft font-mono text-xs text-primary">{{ String.fromCharCode(65 + index) }}</span>
          <span
            class="truncate text-xs text-muted"
            :title="source?.name"
          >{{ source?.name || 'Select a data source' }}</span>
        </button>
        <div class="flex shrink-none gap-space-xs">
          <UButton
            icon="i-lucide-copy"
            :aria-label="'Duplicate query ' + String.fromCharCode(65 + index)"
            color="neutral"
            size="xs"
            variant="ghost"
            :disabled="queries.length >= 10"
            @click="queries = [...queries, query]"
          />
          <UButton
            icon="i-lucide-trash-2"
            :aria-label="'Remove query ' + String.fromCharCode(65 + index)"
            color="neutral"
            size="xs"
            variant="ghost"
            :disabled="queries.length <= 1"
            @click="remove(index)"
          />
        </div>
      </header>
      <div
        v-show="!collapsed.includes(index)"
        class="p-space-lg"
      >
        <QueryEditor
          :model-value="query"
          :source="props.source"
          :range="range"
          builder
          @update:model-value="update(index, $event)"
          @run="$emit('run')"
        />
      </div>
    </section>
    <UButton
      size="sm"
      label="Add query"
      icon="i-lucide-plus"
      color="neutral"
      variant="outline"
      :disabled="queries.length >= 10"
      @click="queries = [...queries, '']"
    />
  </div>
</template>
