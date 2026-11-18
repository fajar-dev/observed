<template>
  <UDropdownMenu
    :items="[{ label: 'Sign out', icon: 'i-lucide-log-out', color: 'error', to: '#' }]"
    :content="{ align: 'end' }"
  >
    <button
      type="button"
      aria-label="User profile"
      class="hidden cursor-pointer rounded-full hover:ring hover:ring-default focus-visible:outline-2 focus-visible:outline-primary sm:inline-flex"
    >
      <UAvatar
        aria-hidden="true"
        text="GS"
        size="sm"
        class="bg-primary-500/10 text-primary-700 dark:text-primary-300"
      />
    </button>
  </UDropdownMenu>
</template>
