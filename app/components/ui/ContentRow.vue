<script setup lang="ts">
defineProps<{ heading?: boolean }>()
</script>

<template>
  <div
    class="content-row"
    :class="heading ? 'content-row-heading' : ''"
  >
    <div class="content-row-main">
      <slot />
    </div>
    <div class="content-row-details">
      <slot name="details" />
    </div>
    <div class="content-row-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
