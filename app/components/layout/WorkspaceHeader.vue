<script setup lang="ts">
const items = useAppBreadcrumb()
const navigation = useAppNavigation()
const { data: dashboards } = useDashboards()
const groups = computed(() => [
  { id: 'pages', label: 'Monitoring', items: navigation.value.map(item => ({ label: item.label, to: item.to, icon: item.icon })) },
  { id: 'dashboards', label: 'Dashboards', items: dashboards.value.map(item => ({ label: item.name, to: '/dashboards/' + item.id, icon: 'i-lucide-panels-top-left' })) }
])
</script>

<template>
  <UDashboardNavbar
    :toggle="false"
    :ui="{ root: 'font-heading h-header min-h-header shrink-none bg-default ps-space-md pe-space-md sm:ps-space-lg sm:pe-space-xl', left: 'min-w-none flex-fill gap-space-sm', right: 'gap-space-sm' }"
  >
    <template #left>
      <UDashboardSidebarToggle aria-label="Open navigation" />
      <WorkspaceBrand />
      <USeparator
        orientation="vertical"
        class="h-icon-md shrink-none"
      />
      <UBreadcrumb
        :items="items"
        class="min-w-none"
      />
    </template>
    <template #right>
      <UDashboardSearchButton
        label="Search"
        size="sm"
        class="hidden w-search justify-start rounded-full md:inline-flex"
      />
      <UDashboardSearchButton
        label="Search"
        collapsed
        class="md:hidden"
      />
      <AlertNotificationMenu />
      <AccountMenu />
    </template>
  </UDashboardNavbar>
  <UDashboardSearch
    :groups="groups"
    :color-mode="false"
    title="Search Observed"
    placeholder="Search"
  />
</template>
