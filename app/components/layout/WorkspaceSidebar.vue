<script setup lang="ts">
const collapsed = useState('workspace-sidebar-collapsed', () => true)
const navigation = useAppNavigation()
</script>

<template>
  <UDashboardSidebar
    id="observe-navigation"
    v-model:collapsed="collapsed"
    collapsible
    :toggle="false"
    :default-size="15"
    :collapsed-size="3.5"
    :ui="{ root: 'group/sidebar min-h-none min-w-sidebar-rail max-w-sidebar bg-default lg:data-[collapsed=false]:min-w-sidebar', header: 'hidden', body: 'p-space-sm lg:overflow-hidden', content: 'max-w-sidebar border-e border-default', footer: 'border-t border-default p-space-sm pb-safe' }"
  >
    <template #default="{ collapsed: isCollapsed }">
      <UNavigationMenu
        :items="navigation"
        orientation="vertical"
        color="neutral"
        :collapsed="isCollapsed"
        tooltip
        :ui="{ list: 'gap-space-sm', link: ['py-space-sm font-medium before:rounded-md aria-[current=page]:text-primary aria-[current=page]:before:bg-primary-soft', isCollapsed && 'mx-auto w-fit justify-center'], linkLeadingIcon: 'text-current size-icon-md' }"
      />
    </template>
    <template #footer="{ collapsed: isCollapsed }">
      <div
        class="grid justify-items-center gap-space-xs"
        :class="isCollapsed ? '' : 'grid-cols-pair'"
      >
        <UColorModeButton
          color="neutral"
          variant="ghost"
          square
          aria-label="Change appearance"
        />
        <UDashboardSidebarCollapse
          color="neutral"
          variant="ghost"
          square
        />
      </div>
    </template>
  </UDashboardSidebar>
</template>
