<script setup lang="ts">
defineProps<{ title?: string, list?: boolean }>()
</script>

<template>
  <UCard :ui="{ root: 'content-panel', header: 'content-panel-header', body: list ? 'content-panel-body content-panel-list' : 'content-panel-body', footer: 'content-panel-footer' }">
    <template
      v-if="title || $slots.header"
      #header
    >
      <slot name="header">
        <h2 class="text-sm font-medium text-highlighted">
          {{ title }}
        </h2>
      </slot>
      <slot name="actions" />
    </template>
    <slot />
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UCard>
</template>
