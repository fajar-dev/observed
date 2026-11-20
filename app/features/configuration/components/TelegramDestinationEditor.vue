<script setup lang="ts">
import { telegramDestinationSchema } from '#shared/domain/telegram-destination'
import type { TelegramDestination, TelegramDestinationInput } from '#shared/domain/telegram-destination'

const props = defineProps<{ destination?: TelegramDestination, state: TelegramDestinationInput, busy: boolean, error: string }>()
const open = defineModel<boolean>('open', { required: true })
defineEmits<{ save: [], change: [patch: Partial<TelegramDestinationInput>] }>()
const schema = computed(() => telegramDestinationSchema.superRefine((value, context) => {
  if (!props.destination?.hasToken && !value.token) context.addIssue({ code: 'custom', path: ['token'], message: 'Enter a Telegram bot token.' })
}))
useErrorToast(() => open.value ? props.error : '')
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="destination ? 'Edit Telegram destination' : 'Add Telegram destination'"
    description="Choose the Telegram bot and chat for your monitoring team."
    save-label="Save destination"
    :schema="schema"
    :state="state"
    :busy="busy"
    @save="$emit('save')"
  >
    <UFormField
      name="name"
      label="Name"
      required
    >
      <UInput
        :model-value="state.name"
        size="sm"
        class="w-full"
        placeholder="Bridge monitoring team"
        @update:model-value="$emit('change', { name: String($event) })"
      />
    </UFormField>
    <UFormField
      name="chatId"
      label="Chat ID"
      required
      help="Numeric chat ID or a public channel @username."
    >
      <UInput
        :model-value="state.chatId"
        size="sm"
        class="w-full"
        placeholder="-1001234567890"
        @update:model-value="$emit('change', { chatId: String($event) })"
      />
    </UFormField>
    <UFormField
      name="token"
      label="Bot token"
      :required="!destination?.hasToken"
      :hint="destination?.hasToken ? 'Token stored' : undefined"
      :help="destination?.hasToken ? 'Leave blank to keep the current bot token.' : 'Enter the token provided by BotFather.'"
    >
      <UInput
        :model-value="state.token"
        size="sm"
        class="w-full"
        type="password"
        autocomplete="new-password"
        @update:model-value="$emit('change', { token: String($event || '') || undefined })"
      />
    </UFormField>
  </FormDialog>
</template>
