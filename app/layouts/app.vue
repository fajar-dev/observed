<template>
  <UDashboardGroup
    unit="rem"
    class="relative inset-auto h-dvh flex-col bg-default text-default"
  >
    <AppHeader />

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <AppSidebar />

      <UDashboardPanel
        id="project-content"
        class="min-h-0 flex-1 overflow-hidden"
      >
        <main
          aria-label="Project content"
          tabindex="0"
          class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          <slot />
        </main>
      </UDashboardPanel>
    </div>
  </UDashboardGroup>
</template>
