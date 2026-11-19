<script setup lang="ts">
defineProps<{ message: unknown }>()
</script>

<template>
  <UAlert
    v-if="message"
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Something went wrong"
    :description="typeof message === 'string' ? message : apiErrorMessage(message)"
  />
</template>
