<script setup lang="ts">
const { user, signOut } = useAuthentication()
const { busy, error, perform } = useAsyncAction()
const toast = useNotifications()
async function leave() {
  await perform(signOut)
  if (error.value) toast.add({ title: 'Sign out failed', description: error.value, color: 'error' })
}
const items = computed(() => [
  { label: 'Profile', icon: 'i-lucide-user', to: '/profile' },
  { label: 'Sign out', icon: 'i-lucide-log-out', color: 'error' as const, onSelect: leave, disabled: busy.value }
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end' }"
  >
    <UButton
      size="sm"
      class="rounded-full"
      :avatar="{ alt: user?.name || 'Account', size: 'md' }"
      aria-label="Account menu"
      color="neutral"
      variant="ghost"
      square
    />
  </UDropdownMenu>
</template>
