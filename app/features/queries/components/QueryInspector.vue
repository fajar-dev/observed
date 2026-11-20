<script setup lang="ts">
import type { QueryResponse } from '#shared/domain/query'

defineProps<{ results: QueryResponse[], queries: string[], loading?: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const tab = ref('stats')
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Query inspector"
    description="Inspect query performance and returned sensor measurements."
    :ui="{ content: 'sm:max-w-modal' }"
  >
    <template #body>
      <UTabs
        v-model="tab"
        :content="false"
        :items="[{ label: 'Stats', value: 'stats' }, { label: 'Query', value: 'query' }, { label: 'JSON', value: 'json' }, { label: 'Data', value: 'data' }]"
      />
      <div class="mt-space-lg">
        <dl
          v-if="tab === 'stats'"
          class="space-y-space-lg"
        >
          <div class="flex justify-between border-b border-default pb-space-md">
            <dt class="text-muted">
              Total query time
            </dt><dd>{{ results.reduce((sum, result) => sum + result.duration, 0) }} ms</dd>
          </div>
          <div class="flex justify-between border-b border-default pb-space-md">
            <dt class="text-muted">
              Rows returned
            </dt><dd>{{ results.reduce((sum, result) => sum + result.rows.length, 0).toLocaleString() }}</dd>
          </div>
          <div class="flex justify-between border-b border-default pb-space-md">
            <dt class="text-muted">
              Queries
            </dt><dd>{{ results.length }} / {{ queries.length }}</dd>
          </div>
          <div class="flex justify-between border-b border-default pb-space-md">
            <dt class="text-muted">
              Response limit reached
            </dt><dd>{{ results.some(result => result.truncated) ? 'Yes' : 'No' }}</dd>
          </div>
        </dl>
        <div
          v-else-if="tab === 'query'"
          class="space-y-space-md"
        >
          <pre
            v-for="(query, index) in queries"
            :key="index"
            class="overflow-auto rounded-md border border-default bg-muted p-space-lg font-mono text-xs leading-relaxed whitespace-pre-wrap"
          >{{ query }}</pre>
        </div>
        <pre
          v-else-if="tab === 'json'"
          class="max-h-overlay overflow-auto rounded-md border border-default bg-muted p-space-lg font-mono text-xs"
        >{{ JSON.stringify(results, null, 2) }}</pre>
        <template v-else>
          <UButton
            size="sm"
            label="Download CSV"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            :disabled="!results.length"
            class="mb-space-lg"
            @click="downloadQueryCsv(results)"
          />
          <QueryVisualization
            :results="results"
            type="table"
          />
        </template>
      </div>
    </template>
  </USlideover>
</template>
