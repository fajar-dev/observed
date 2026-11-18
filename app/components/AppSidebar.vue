<script setup lang="ts">
const collapsed = ref(true)
const controlClass = 'rounded-lg text-muted hover:bg-elevated/50 hover:text-highlighted'
const navigation = useAppNavigation()
</script>

<template>
  <UDashboardSidebar
    id="project-navigation"
    v-model:collapsed="collapsed"
    :toggle="false"
    collapsible
    :default-size="15"
    :collapsed-size="3.5"
    :ui="{
      root: 'group/sidebar min-h-0 min-w-14 max-w-60 bg-default lg:data-[collapsed=false]:min-w-60',
      header: 'hidden',
      body: 'p-2 lg:overflow-hidden',
      content: 'max-w-72 divide-y-0 border-e border-default shadow-lg',
      footer: 'border-t border-default p-2 max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:group-data-[collapsed=false]/sidebar:px-3'
    }"
  >
    <template #default="{ collapsed: isCollapsed }">
      <UNavigationMenu
        :items="navigation"
        orientation="vertical"
        color="neutral"
        :collapsed="isCollapsed"
        tooltip
        :ui="{
          list: 'flex flex-col gap-1.5',
          link: [
            'before:inset-0 before:rounded-lg aria-[current=page]:font-semibold aria-[current=page]:text-primary aria-[current=page]:before:bg-primary/10',
            isCollapsed && 'mx-auto w-fit justify-center'
          ],
          linkLeadingIcon: 'text-current'
        }"
      />
    </template>

    <template #footer="{ collapsed: isCollapsed }">
      <div
        class="relative grid w-full justify-items-center gap-1"
        :class="{
          'grid-cols-2 before:pointer-events-none before:absolute before:inset-y-2 before:left-1/2 before:w-px before:border-s before:border-default': !isCollapsed
        }"
      >
        <UColorModeButton
          size="md"
          square
          :block="!isCollapsed"
          :class="controlClass"
        />
        <UDashboardSidebarToggle
          size="md"
          square
          block
          :class="controlClass"
        />
        <UDashboardSidebarCollapse
          size="md"
          square
          :block="!isCollapsed"
          :class="controlClass"
        />
      </div>
    </template>
  </UDashboardSidebar>
</template>
