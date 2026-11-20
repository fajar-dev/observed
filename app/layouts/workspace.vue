<script setup lang="ts">
const { kiosk } = useDashboardKiosk()
</script>

<template>
  <UDashboardGroup
    unit="rem"
    class="relative inset-auto h-dvh flex-col bg-default text-default"
  >
    <WorkspaceHeader v-if="!kiosk" />
    <div class="flex min-h-none flex-fill overflow-hidden">
      <WorkspaceSidebar v-if="!kiosk" />
      <UDashboardPanel
        id="observe-content"
        class="min-h-none min-w-none flex-fill overflow-hidden"
      >
        <main
          id="workspace-main"
          aria-label="Main content"
          tabindex="0"
          class="min-h-none min-w-none flex-fill overflow-y-auto overscroll-y-contain focus-visible:outline-primary"
        >
          <slot />
        </main>
      </UDashboardPanel>
    </div>
  </UDashboardGroup>
</template>
