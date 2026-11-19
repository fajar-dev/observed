<script setup lang="ts">
const { destinations, loadError, status, busy, error, open, disconnect, editing, testing, search, filteredDestinations, form, edit, save, test, remove, menu } = useTelegramDestinationsController()
defineExpose({ create: () => edit() })
useErrorToast(() => loadError.value || (!open.value && !disconnect.value ? error.value : ''))
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
