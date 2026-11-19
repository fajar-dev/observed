<script setup lang="ts">
const props = defineProps<{ importAction?: () => void }>()
const items = [
  { label: 'Create new', icon: 'i-lucide-plus', to: '/dashboards/new' },
  { label: 'Import JSON', icon: 'i-lucide-upload', onSelect: () => {
    if (props.importAction) props.importAction()
    else void navigateTo('/dashboards?import=1')
  } }
]
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      size="sm"
      label="New dashboard"
      icon="i-lucide-plus"
      trailing-icon="i-lucide-chevron-down"
    />
  </UDropdownMenu>
</template>
