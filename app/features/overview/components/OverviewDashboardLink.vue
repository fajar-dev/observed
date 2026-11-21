<script setup lang="ts">
import type { Dashboard } from '#shared/domain/dashboard'

defineProps<{ dashboard: Dashboard }>()
</script>

<template>
  <NuxtLink
    :to="'/dashboards/' + dashboard.id"
    :aria-label="dashboard.name"
    class="flex min-w-none items-center gap-space-lg px-space-lg py-space-md hover:bg-muted"
  >
    <UIcon
      name="i-lucide-panels-top-left"
      class="size-icon-md shrink-none text-primary"
    />
    <div class="min-w-none flex-fill">
      <p class="truncate text-sm font-semibold text-highlighted">{{ dashboard.name }}</p>
      <p
        v-if="dashboard.description"
        :title="dashboard.description"
        class="mt-space-xs truncate text-xs text-muted"
      >{{ dashboard.description }}</p>
      <p class="mt-space-xs truncate text-xs text-dimmed">
        {{ dashboard.folder || 'General' }} · {{ dashboard.panels.length }} {{ dashboard.panels.length === 1 ? 'panel' : 'panels' }}
      </p>
    </div>
    <time
      :datetime="dashboard.updatedAt"
      class="hidden shrink-none text-xs text-dimmed sm:block"
    >{{ new Date(dashboard.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) }}</time>
    <UIcon
      name="i-lucide-arrow-up-right"
      class="size-icon-sm shrink-none text-dimmed"
    />
  </NuxtLink>
</template>
