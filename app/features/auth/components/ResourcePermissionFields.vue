<script setup lang="ts">
import type { UserPermissions } from '#shared/domain/permissions'

const props = defineProps<{ label: string, resources: { id: string, name: string }[], editable: boolean }>()
const model = defineModel<UserPermissions['dashboards']>({ required: true })
const scopes = [{ label: 'No access', value: 'none' }, { label: 'Selected resources', value: 'selected' }, { label: 'All resources', value: 'all' }]
const levels = computed(() => [{ label: 'View', value: 'view' }, ...(props.editable ? [{ label: 'Edit', value: 'edit' }] : [])])
const selected = computed({
  get: () => model.value.grants.map(grant => grant.id),
  set: (ids: string[]) => { model.value.grants = ids.map(id => model.value.grants.find(grant => grant.id === id) ?? { id, access: 'view' }) }
})
</script>

<template>
  <section class="space-y-space-md">
    <UFormField :label="label">
      <USelect
        v-model="model.scope"
        placeholder="Select resource access"
        :items="scopes"
        :aria-label="label + ' access'"
        class="w-full"
      />
    </UFormField>
    <UFormField
      v-if="model.scope === 'all'"
      label="Permission"
    >
      <USelect
        v-model="model.access"
        placeholder="Select permission"
        :items="levels"
        :disabled="!editable"
        :aria-label="label + ' permission'"
        class="w-full"
      />
    </UFormField>
    <template v-if="model.scope !== 'none'">
      <p
        v-if="model.scope === 'all'"
        class="text-xs text-muted"
      >
        Individual permissions override the default permission above.
      </p>
      <USelectMenu
        v-model="selected"
        :items="resources"
        value-key="id"
        label-key="name"
        multiple
        :placeholder="'Select ' + label.toLowerCase()"
        :aria-label="'Select ' + label.toLowerCase()"
        class="w-full"
      />
      <div
        v-for="grant in model.grants"
        :key="grant.id"
        class="flex min-w-none items-center gap-space-md"
      >
        <span class="min-w-none flex-fill truncate text-sm">{{ resources.find(item => item.id === grant.id)?.name || 'Unavailable resource' }}</span>
        <USelect
          v-model="grant.access"
          placeholder="Select permission"
          :items="levels"
          :disabled="!editable"
          :aria-label="'Permission for ' + (resources.find(item => item.id === grant.id)?.name || grant.id)"
        />
      </div>
    </template>
  </section>
</template>
