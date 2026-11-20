<script setup lang="ts">
defineProps<{ title: string, description?: string, icon?: string, inline?: boolean }>()
</script>

<template>
  <header
    class="content-toolbar"
    :data-inline="inline || undefined"
  >
    <div class="flex min-w-none items-center gap-space-md">
      <UIcon
        v-if="icon"
        :name="icon"
        class="size-icon-md shrink-none text-muted"
      />
      <div class="min-w-none">
        <h1
          class="truncate text-lg font-semibold text-highlighted"
          :title="title"
        >
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="truncate text-xs text-muted"
          :title="description"
        >
          {{ description }}
        </p>
      </div>
      <slot name="status" />
    </div>
    <div class="toolbar content-toolbar-actions">
      <slot />
    </div>
  </header>
</template>
