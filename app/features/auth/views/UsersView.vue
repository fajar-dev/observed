<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AuthUser } from '#shared/domain/auth'
import { userInputSchema } from '#shared/domain/auth'

usePageSeo('Users', 'Manage team access and monitoring permissions in Observed.')

const { permissionsOpen, permissionsUser, current, users, status, loadError, busy, error, search, open, deleting, selected, form, password, filtered, edit, save, menu, remove } = useUsers()
const columns: TableColumn<AuthUser>[] = [
  { accessorKey: 'name', header: 'User' }, { accessorKey: 'role', header: 'Role' }, { accessorKey: 'enabled', header: 'Status' },
  { accessorKey: 'lastSignInAt', header: 'Last sign in' },
  { id: 'actions', header: 'Actions', meta: { class: { th: 'w-compact text-right', td: 'w-compact text-right' } } }
]
const roleOptions = [{ label: 'Admin', value: 'admin' }, { label: 'Editor', value: 'editor' }, { label: 'Viewer', value: 'viewer' }]
useErrorToast(() => loadError.value || (!deleting.value ? error.value : ''))
</script>

<template>
  <WorkspacePage
    compact
    title="Users"
    description="Manage team access and monitoring permissions."
    icon="i-lucide-users"
  >
    <template #actions>
      <UButton
        label="Add user"
        size="sm"
        icon="i-lucide-plus"
        @click="edit()"
      />
    </template>
    <div class="toolbar">
      <UInput
        v-model="search"
        placeholder="Search users"
        aria-label="Search users"
        icon="i-lucide-search"
        size="sm"
        class="w-full sm:max-w-search"
      />
    </div>
    <USkeleton
      v-if="status === 'pending' && !users.length"
      class="h-compact"
    />
    <ContentPanel v-else>
      <UTable
        :data="filtered"
        :columns="columns"
      >
        <template #name-cell="{ row }">
          <button
            class="text-left"
            @click="edit(row.original)"
          >
            <span class="font-medium text-highlighted">{{ row.original.name }}{{ row.original.id === current?.id ? ' (you)' : '' }}</span>
            <span class="mt-space-xs block text-xs text-muted">{{ row.original.email }}</span>
          </button>
        </template>
        <template #role-cell="{ row }">
          <span class="capitalize">{{ row.original.role }}</span>
        </template>
        <template #enabled-cell="{ row }">
          <UBadge
            :label="row.original.enabled ? 'Active' : 'Disabled'"
            :color="row.original.enabled ? 'success' : 'neutral'"
            variant="subtle"
          />
        </template>
        <template #lastSignInAt-cell="{ row }">
          <span class="whitespace-nowrap text-xs text-muted">{{ row.original.lastSignInAt ? new Date(row.original.lastSignInAt).toLocaleString() : 'Never' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu
            :items="menu(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              aria-label="User actions"
              size="sm"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </ContentPanel>
    <FormDialog
      v-model:open="open"
      :title="selected ? 'Edit user' : 'Add user'"
      :state="form"
      :schema="userInputSchema"
      :busy="busy"
      save-label="Save user"
      @save="save"
    >
      <UFormField
        name="name"
        label="Name"
        required
      >
        <UInput
          v-model="form.name"
          placeholder="Full name"
          autocomplete="name"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="email"
        label="Email"
        required
      >
        <UInput
          v-model="form.email"
          placeholder="you@company.com"
          type="email"
          autocomplete="username"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="role"
        label="Role"
        required
      >
        <USelect
          v-model="form.role"
          placeholder="Select a role"
          :items="roleOptions"
          :disabled="selected?.id === current?.id"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="password"
        :label="selected ? 'New password' : 'Password'"
        :help="selected ? 'Password changes sign out all sessions.' : undefined"
        :required="!selected"
      >
        <UInput
          v-model="password"
          :placeholder="selected ? 'Leave blank to keep current password' : 'At least 12 characters'"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>
      <USwitch
        v-model="form.enabled"
        label="Active account"
        :disabled="selected?.id === current?.id"
      />
    </FormDialog>
    <UserPermissionsEditor
      v-model:open="permissionsOpen"
      :user="permissionsUser"
    />
    <ConfirmDeleteDialog
      v-model:open="deleting"
      :label="selected?.name || 'user'"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </WorkspacePage>
</template>
