<script setup lang="ts">
const view = defineModel<string>({ required: true })
</script>

<template>
  <UFieldGroup
    aria-label="Dashboard display"
    role="group"
  >
    <UButton
      v-for="item in [{ value: 'list', label: 'List view', icon: 'i-lucide-list' }, { value: 'grid', label: 'Grid view', icon: 'i-lucide-grid-2x2' }]"
      :key="item.value"
      size="sm"
      :icon="item.icon"
      :aria-label="item.label"
      :aria-pressed="view === item.value"
      color="neutral"
      variant="outline"
      square
      :class="view === item.value ? 'bg-elevated text-highlighted' : 'text-muted'"
      @click="view = item.value"
    />
  </UFieldGroup>
</template>
