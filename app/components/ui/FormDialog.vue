<script setup lang="ts">
import type { z } from 'zod'

defineProps<{ title: string, saveLabel: string, schema: z.ZodType, state: Record<string, unknown>, busy: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const form = useTemplateRef('form')
defineEmits<{ save: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :dismissible="!busy"
    :close="busy ? false : undefined"
    :ui="{ content: 'sm:max-w-modal' }"
  >
    <template #body>
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        class="space-y-space-lg"
        @submit="$emit('save')"
      >
        <slot />
      </UForm>
    </template>
    <template #footer>
      <UButton
        size="sm"
        label="Cancel"
        color="neutral"
        variant="outline"
        :disabled="busy"
        @click="open = false"
      />
      <UButton
        size="sm"
        :label="saveLabel"
        icon="i-lucide-save"
        :loading="busy"
        @click="form?.submit()"
      />
    </template>
  </UModal>
</template>
