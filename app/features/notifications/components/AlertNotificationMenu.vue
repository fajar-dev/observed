<script setup lang="ts">
const { snapshot, loading, busy, markRead } = useAlertNotifications()
const open = ref(false)
const operators = { gt: '>', gte: '≥', lt: '<', lte: '≤' }
const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en', { maximumSignificantDigits: 6 }).format(value)
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', collisionPadding: 12 }"
    :ui="{ content: 'w-notification-panel' }"
  >
    <UChip
      :show="snapshot.unread > 0"
      :text="snapshot.unread > 99 ? '99+' : snapshot.unread"
      color="error"
      size="lg"
    >
      <UButton
        icon="i-lucide-bell"
        aria-label="Notifications"
        color="neutral"
        variant="ghost"
        square
      />
    </UChip>
    <template #content>
      <section aria-label="Alert notifications">
        <header class="flex items-center justify-between gap-space-md border-b border-default px-space-lg py-space-md">
          <h2 class="text-sm font-semibold text-highlighted">
            Notifications
          </h2>
          <UButton
            label="Mark all read"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!snapshot.unread || busy"
            @click="markRead()"
          />
        </header>
        <div class="max-h-notification-list overflow-y-auto overscroll-y-contain">
          <p
            v-if="loading && !snapshot.items.length"
            class="p-space-lg text-sm text-muted"
          >
            Loading notifications…
          </p>
          <p
            v-else-if="!snapshot.items.length"
            class="p-space-lg text-sm text-muted"
          >
            No notifications yet. Firing and recovery events appear automatically for your sensor alert rules.
          </p>
          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="item in snapshot.items"
              :key="item.id"
              class="flex items-start gap-space-md p-space-lg"
              :class="!item.readAt ? 'bg-primary/5' : undefined"
            >
              <UIcon
                :name="item.state === 'firing' ? 'i-lucide-bell-ring' : 'i-lucide-circle-check'"
                class="mt-space-xs size-icon-md shrink-none"
                :class="item.state === 'firing' ? 'text-error' : 'text-success'"
              />
              <div class="min-w-none flex-fill space-y-space-xs">
                <p
                  class="text-xs font-medium"
                  :class="item.state === 'firing' ? 'text-error' : 'text-success'"
                >
                  {{ item.state === 'firing' ? 'Firing' : 'Recovered' }}
                </p>
                <p class="text-sm font-semibold break-words text-highlighted">
                  {{ item.alertName }}
                </p>
                <p class="text-xs break-words text-muted">
                  {{ item.sourceName }}
                </p>
                <p class="text-xs text-default">
                  Current {{ number(item.value) }} · Threshold {{ operators[item.operator] }} {{ number(item.threshold) }}
                </p>
                <p
                  v-if="item.summary"
                  class="text-xs break-words text-muted"
                >
                  {{ item.summary }}
                </p>
                <time
                  :datetime="item.occurredAt"
                  class="block text-xs text-dimmed"
                >{{ new Date(item.occurredAt).toLocaleString() }}</time>
                <UButton
                  v-if="!item.readAt"
                  label="Mark as read"
                  size="xs"
                  color="neutral"
                  variant="link"
                  :disabled="busy"
                  @click="markRead(item)"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </UPopover>
</template>
