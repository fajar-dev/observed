<script setup lang="ts">
import { defaultPermissions } from '#shared/domain/permissions'
import type { UserPermissions } from '#shared/domain/permissions'
import type { AuthUser } from '#shared/domain/auth'

const props = defineProps<{ user?: AuthUser }>()
const open = defineModel<boolean>('open', { required: true })
const api = useApiRequest()
const toast = useNotifications()
const { data: dashboards, error: dashboardError } = useDashboards()
const { data: alerts, error: alertError } = useAlertRuleRecords()
const { busy, error, perform } = useAsyncAction()
const draft = ref(defaultPermissions())
const loading = ref(false)
const loaded = ref(false)
let generation = 0
watch(() => [open.value, props.user?.id], async () => {
  const current = ++generation
  if (!open.value || !props.user) return
  loading.value = true
  loaded.value = false
  draft.value = defaultPermissions()
  await perform(async () => {
    const permissions = await api<UserPermissions>('users/' + props.user!.id + '/permissions')
    if (current === generation && open.value) {
      if (props.user?.role === 'viewer') {
        for (const kind of ['dashboards', 'alerts'] as const) {
          permissions[kind].access = 'view'
          permissions[kind].grants = permissions[kind].grants.map(grant => ({ ...grant, access: 'view' }))
        }
      }
      draft.value = permissions
      loaded.value = true
    }
  })
  if (current === generation) loading.value = false
})
useErrorToast(() => open.value ? error.value || dashboardError.value || alertError.value : '', 'Could not update permissions')
async function save() {
  if (!props.user || loading.value || !loaded.value) return
  await perform(async () => {
    await api('users/' + props.user!.id + '/permissions', { method: 'PUT', body: draft.value })
    toast.add({ title: 'Permissions saved', description: 'User must sign in again.', color: 'success' })
    open.value = false
  })
}
</script>

<template>
  <USlideover
    v-model:open="open"
    title="User permissions"
    :dismissible="!busy"
    :ui="{ content: 'sm:max-w-modal' }"
  >
    <template #body>
      <USkeleton
        v-if="loading"
        class="h-chart"
      />
      <div
        v-else
        class="space-y-space-lg"
      >
        <ResourcePermissionFields
          v-model="draft.dashboards"
          label="Dashboards"
          :resources="dashboards"
          :editable="user?.role === 'editor'"
        />
        <ResourcePermissionFields
          v-model="draft.alerts"
          label="Alerts"
          :resources="alerts"
          :editable="user?.role === 'editor'"
        />
        <div class="space-y-space-xs text-xs text-muted">
          <p>Notifications follow alert access.</p>
          <p>Saving signs this user out.</p>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        size="sm"
        label="Cancel"
        color="neutral"
        variant="outline"
        :disabled="busy"
        @click="open = false"
      />
      <UButton
        size="sm"
        label="Save permissions"
        icon="i-lucide-shield-check"
        :loading="busy"
        :disabled="loading || !loaded"
        @click="save"
      />
    </template>
  </USlideover>
</template>
