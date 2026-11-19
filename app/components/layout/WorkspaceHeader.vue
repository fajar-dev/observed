<script setup lang="ts">
const items = useAppBreadcrumb()
const navigation = useAppNavigation()
const { data: dashboards } = useDashboards()
const { data: alerts } = useAlertRuleRecords()
const firing = computed(() => alerts.value.filter(rule => rule.enabled && rule.evaluation?.state === 'firing').length)
const search = ref(false)
const groups = computed(() => [
  { id: 'pages', label: 'Workspace', items: navigation.map(item => ({ label: item.label, to: item.to, icon: item.icon, onSelect: () => { search.value = false } })) },
  { id: 'dashboards', label: 'Dashboards', items: dashboards.value.map(item => ({ label: item.name, to: '/dashboards/' + item.id, icon: 'i-lucide-panels-top-left', onSelect: () => { search.value = false } })) }
])
defineShortcuts({
  meta_k: () => { search.value = !search.value }
})
</script>

<template>
  <UDashboardNavbar
    :toggle="false"
    :ui="{ root: 'h-header min-h-header shrink-none bg-default ps-space-md pe-space-md sm:ps-space-lg sm:pe-space-xl', left: 'min-w-none flex-fill gap-space-sm', right: 'gap-space-sm' }"
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
      <UButton
        label="Search dashboards and pages"
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        aria-label="Search dashboards and pages"
        class="hidden rounded-full md:inline-flex"
        @click="search = true"
      >
        <template #trailing>
          <UKbd>⌘ K</UKbd>
        </template>
      </UButton>
      <UButton
        icon="i-lucide-search"
        aria-label="Search dashboards and pages"
        color="neutral"
        variant="ghost"
        class="md:hidden"
        @click="search = true"
      />
      <UButton
        v-if="firing"
        :label="String(firing)"
        to="/alerts"
        icon="i-lucide-bell-ring"
        aria-label="Firing alerts"
        color="error"
        variant="subtle"
      />
    </template>
  </UDashboardNavbar>
  <UModal
    v-model:open="search"
    title="Search workspace"
    :ui="{ content: 'sm:max-w-modal', body: 'p-none sm:p-none' }"
  >
    <template #body>
      <UCommandPalette
        :groups="groups"
        placeholder="Search dashboards and pages…"
        @update:open="search = $event"
      />
    </template>
  </UModal>
</template>
