<script setup lang="ts">
import type { AuthSession } from '#shared/domain/auth'

const props = defineProps<{ sessions: AuthSession[], busy?: boolean, loading?: boolean }>()
defineEmits<{ revoke: [session: AuthSession] }>()
const page = ref(1)
const pageSize = 10
const ordered = computed(() => [...props.sessions].sort((a, b) => Number(b.current) - Number(a.current) || b.createdAt.localeCompare(a.createdAt)))
const visible = computed(() => ordered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch(() => props.sessions.length, (total) => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(total / pageSize)))
})
</script>

<template>
  <ContentPanel
    title="Active sessions"
    role="region"
    aria-label="Active sessions"
  >
    <USkeleton
      v-if="loading"
      class="m-space-lg h-compact"
    />
    <UEmpty
      v-else-if="!sessions.length"
      title="No active sessions"
      description="Your signed-in browsers appear here."
      icon="i-lucide-monitor"
      variant="naked"
      class="p-space-lg"
    />
    <ul
      v-else
      class="divide-y divide-default"
    >
      <li
        v-for="session in visible"
        :key="session.id"
      >
        <ContentRow>
          <div class="min-w-none">
            <p class="text-sm font-medium">
              {{ session.current ? 'This session' : 'Browser session' }}
            </p>
            <p
              :title="session.userAgent"
              class="mt-space-xs truncate text-xs text-muted"
            >
              {{ session.userAgent }}
            </p>
          </div>
          <template #details>
            Started {{ new Date(session.createdAt).toLocaleString() }}
          </template>
          <template #actions>
            <UButton
              label="Revoke"
              size="sm"
              color="neutral"
              variant="outline"
              :disabled="busy"
              @click="$emit('revoke', session)"
            />
          </template>
        </ContentRow>
      </li>
    </ul>
    <template
      v-if="sessions.length > pageSize"
      #footer
    >
      <div class="flex flex-wrap items-center justify-between gap-space-md">
        <p class="text-xs text-muted">
          {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, sessions.length) }} of {{ sessions.length }} sessions
        </p>
        <UPagination
          v-model:page="page"
          :total="sessions.length"
          :items-per-page="pageSize"
          :sibling-count="0"
          :ui="{ first: 'hidden', last: 'hidden' }"
          :disabled="busy"
          size="sm"
          aria-label="Session pages"
        />
      </div>
    </template>
  </ContentPanel>
</template>
