<script setup lang="ts">
defineProps<{ label: string, loading?: boolean, error?: string }>()
const open = defineModel<boolean>('open', { required: true })
defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="'Delete ' + label + '?'"
    description="This action permanently removes the record."
    :dismissible="!loading"
  >
    <template #body>
      <RequestError :message="error" />
      <div class="mt-space-md flex justify-end gap-space-sm">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="loading"
          @click="$emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
