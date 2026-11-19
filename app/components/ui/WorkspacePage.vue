<script setup lang="ts">
defineProps<{ title: string, description?: string, dashboard?: boolean, compact?: boolean, icon?: string, headerHidden?: boolean }>()
</script>

<template>
  <UContainer
    class="workspace-content"
    :class="dashboard ? 'workspace-dashboard' : compact ? 'workspace-management' : 'space-y-space-xl'"
  >
    <slot
      v-if="!headerHidden"
      name="header"
    >
      <ContentToolbar
        v-if="compact"
        :title="title"
        :description="description"
        :icon="icon"
      >
        <slot name="actions" />
      </ContentToolbar>
      <UPageHeader
        v-else
        :title="title"
        :description="description"
      >
        <template #links>
          <slot name="actions" />
        </template>
      </UPageHeader>
    </slot>
    <slot />
  </UContainer>
</template>
