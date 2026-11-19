<script setup lang="ts">
import type { TelegramDestination, TelegramDestinationInput } from '#shared/domain/telegram-destination'

const { data: destinations, error: loadError, refresh, status } = useTelegramDestinations()
const { busy, error, perform } = useAsyncAction()
const toast = useToast()
const open = ref(false)
const disconnect = ref(false)
const editing = ref<TelegramDestination>()
const testing = ref('')
const search = ref('')
const filteredDestinations = computed(() => destinations.value.filter(destination => `${destination.name} ${destination.chatId}`.toLowerCase().includes(search.value.trim().toLowerCase())))
defineExpose({ create: () => edit() })
const form = reactive<TelegramDestinationInput>({ name: '', chatId: '', token: undefined })

function edit(destination?: TelegramDestination) {
  editing.value = destination
  form.name = destination?.name ?? ''
  form.chatId = destination?.chatId ?? ''
  form.token = undefined
  error.value = ''
  open.value = true
}

function menu(destination: TelegramDestination) {
  return [
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => edit(destination) },
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => {
      editing.value = destination
      error.value = ''
      disconnect.value = true
    } }
  ]
}

async function save() {
  await perform(async () => {
    const id = editing.value?.id
    await apiRequest(id ? `telegram-destinations/${id}` : 'telegram-destinations', { method: id ? 'PUT' : 'POST', body: form })
    form.token = undefined
    open.value = false
    await refresh()
    toast.add({ title: 'Telegram destination saved', color: 'success' })
  })
}

async function test(destination: TelegramDestination) {
  testing.value = destination.id
  try {
    await perform(async () => {
      await apiRequest(`telegram-destinations/${destination.id}/test`, { method: 'POST' })
      toast.add({ title: `Test sent to ${destination.name}`, color: 'success' })
    })
  } finally {
    testing.value = ''
  }
}

async function remove() {
  if (!editing.value) return
  const id = editing.value.id
  await perform(async () => {
    await apiRequest(`telegram-destinations/${id}`, { method: 'DELETE' })
    disconnect.value = false
    await refresh()
  })
}
</script>

<template>
  <section
    id="telegram"
    class="space-y-space-md"
  >
    <div class="toolbar">
      <UInput
        v-model="search"
        size="sm"
        icon="i-lucide-search"
        placeholder="Search Telegram destinations"
        aria-label="Search Telegram destinations"
        class="w-full sm:max-w-search"
      />
    </div>
    <RequestError :message="loadError || (!open && !disconnect ? error : '')" />
    <USkeleton
      v-if="status === 'pending' && !destinations.length"
      class="h-compact"
    />
    <UEmpty
      v-else-if="!destinations.length && !loadError"
      variant="naked"
      icon="i-lucide-send"
      title="No Telegram destinations"
      description="Add a bot token and chat ID to receive alert notifications."
      class="surface py-space-lg"
      size="sm"
    />
    <ContentPanel
      v-else
      list
    >
      <ContentRow heading>
        Destination
        <template #details>
          Telegram chat
        </template>
        <template #actions>
          Actions
        </template>
      </ContentRow>
      <ContentRow
        v-for="destination in filteredDestinations"
        :key="destination.id"
      >
        <div class="grid size-control-md shrink-none place-items-center rounded-md border border-default bg-muted text-primary">
          <UIcon
            name="i-lucide-send"
            class="size-icon-md"
          />
        </div>
        <h3
          class="min-w-none truncate text-sm font-medium text-highlighted"
          :title="destination.name"
        >
          {{ destination.name }}
        </h3>
        <template #details>
          {{ destination.chatId }}
        </template>
        <template #actions>
          <UTooltip text="Send test message">
            <UButton
              size="sm"
              icon="i-lucide-send"
              aria-label="Send test message"
              color="neutral"
              variant="ghost"
              :loading="testing === destination.id"
              :disabled="busy"
              @click="test(destination)"
            />
          </UTooltip>
          <UDropdownMenu
            :items="menu(destination)"
            :content="{ align: 'end' }"
          >
            <UButton
              size="sm"
              icon="i-lucide-ellipsis-vertical"
              aria-label="Telegram destination actions"
              color="neutral"
              variant="ghost"
              :disabled="busy"
            />
          </UDropdownMenu>
        </template>
      </ContentRow>
      <p
        v-if="!filteredDestinations.length"
        class="px-space-lg py-space-md text-sm text-muted"
      >
        No Telegram destinations match your search.
      </p>
    </ContentPanel>
    <TelegramDestinationEditor
      v-model:open="open"
      :destination="editing"
      :state="form"
      :busy="busy"
      :error="error"
      @save="save"
      @change="Object.assign(form, $event)"
    />
    <ConfirmDeleteDialog
      v-model:open="disconnect"
      :label="editing?.name ?? 'Telegram destination'"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </section>
</template>
