<script setup lang="ts">
const props = defineProps<{ label: string, loading?: boolean, error?: string }>()
const open = defineModel<boolean>('open', { required: true })
defineEmits<{ confirm: [] }>()
useErrorToast(() => open.value ? props.error : '', 'Could not delete record')
</script>

<template>
  <UModal
    v-model:open="open"
    :title="'Delete ' + label + '?'"
    :dismissible="!loading"
  >
    <template #footer>
      <UButton
        size="sm"
        label="Cancel"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="open = false"
      />
      <UButton
        size="sm"
        label="Delete"
        color="error"
        :loading="loading"
        @click="$emit('confirm')"
      />
    </template>
  </UModal>
</template>
