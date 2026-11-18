<script setup lang="ts">
const items = useAppBreadcrumb()
const navigation = useAppNavigation()
</script>

<template>
  <UDashboardNavbar
    :toggle="false"
    :ui="{ root: 'h-14 min-h-14 bg-default px-3 sm:px-5', left: 'min-w-0 flex-1 gap-2 sm:gap-3', right: 'gap-1.5 sm:gap-2' }"
  >
    <template #left>
      <UDashboardSidebarToggle
        size="md"
        square
      />
      <NuxtLink
        to="/"
        aria-label="AMTI Overview"
        class="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        <AppLogo
          :mobile="{ variant: 'compact', width: 32, height: 32 }"
          :desktop="{ variant: 'full', width: 110, height: 34 }"
        />
      </NuxtLink>
      <USeparator
        orientation="vertical"
        class="h-5 shrink-0"
      />
      <UBreadcrumb
        :items="items"
        color="neutral"
      />
    </template>

    <template #right>
      <UDashboardSearchButton
        aria-label="Search"
        size="md"
        variant="outline"
        collapsed
        class="rounded-full md:hidden"
      />
      <UDashboardSearchButton
        aria-label="Search"
        size="sm"
        class="hidden min-w-64 rounded-full md:inline-flex"
      />
      <UDashboardSearch
        placeholder="Search pages…"
        :color-mode="false"
        :groups="[{
          id: 'pages',
          label: 'Pages',
          items: navigation
        }]"
      />
      <UTooltip text="Feedback">
        <UButton
          href="#"
          aria-label="Feedback"
          icon="i-lucide-message-square"
          color="neutral"
          variant="outline"
          size="sm"
          square
          class="rounded-full"
        />
      </UTooltip>
      <UTooltip text="Help">
        <UButton
          href="#"
          aria-label="Help"
          icon="i-lucide-circle-help"
          color="neutral"
          variant="outline"
          size="sm"
          square
          class="rounded-full"
        />
      </UTooltip>
      <UTooltip text="Notifications">
        <UButton
          href="#"
          aria-label="Notifications"
          icon="i-lucide-bell"
          color="neutral"
          variant="outline"
          size="sm"
          square
          class="rounded-full"
        />
      </UTooltip>
      <AppUserMenu />
    </template>
  </UDashboardNavbar>
</template>
