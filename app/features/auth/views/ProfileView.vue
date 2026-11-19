<script setup lang="ts">
import { profileSchema } from '#shared/domain/auth'

const { auth, route, configuration, linked, sessions, busy, error, loadError, form, state, save, revoke } = useProfile()
useErrorToast(() => loadError.value || error.value, 'Account action failed')

useNotice(() => route.query.error === 'oauth'
  ? {
      title: 'The sign-in provider could not be connected',
      description: 'Try again or ask an administrator to check the configuration. An identity already linked to another account cannot be connected.',
      color: 'error'
    }
  : route.query.linked === '1'
    ? {
        title: 'Sign-in provider connected',
        description: 'You can now use this provider to sign in.',
        color: 'success'
      }
    : undefined)
</script>

<template>
  <WorkspacePage
    compact
    title="Profile"
    description="Your account, sign-in methods, and active sessions."
    icon="i-lucide-user"
  >
    <div class="grid items-start gap-space-lg lg:grid-cols-pair">
      <ContentPanel title="Account">
        <UForm
          :schema="profileSchema"
          :state="state"
          class="space-y-space-lg p-space-lg"
          @submit="save"
        >
          <UFormField label="Email">
            <UInput
              :model-value="auth.user.value?.email"
              disabled
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="name"
            label="Name"
            required
          >
            <UInput
              v-model="form.name"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>
          <template v-if="auth.user.value?.hasPassword">
            <UFormField
              name="currentPassword"
              label="Current password"
            >
              <UInput
                v-model="form.currentPassword"
                type="password"
                autocomplete="current-password"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="password"
              label="New password"
              help="At least 12 characters. Changing your password signs out all sessions."
            >
              <UInput
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                class="w-full"
              />
            </UFormField>
          </template>
          <UButton
            type="submit"
            label="Save changes"
            size="sm"
            :loading="busy"
          />
        </UForm>
      </ContentPanel>
      <div class="space-y-space-lg">
        <ContentPanel
          v-if="configuration?.providers.length"
          title="Sign-in methods"
        >
          <div class="space-y-space-md p-space-lg">
            <div
              v-for="provider in configuration.providers"
              :key="provider"
              class="flex items-center justify-between gap-space-md"
            >
              <span class="text-sm capitalize">{{ provider }}</span>
              <UBadge
                v-if="linked.includes(provider)"
                label="Connected"
                color="success"
                variant="subtle"
              />
              <UButton
                v-else
                :href="'/api/observe/auth/oauth/' + provider + '?link=1'"
                external
                :label="'Connect ' + provider"
                color="neutral"
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </ContentPanel>
        <ContentPanel title="Active sessions">
          <ul class="divide-y divide-default">
            <li
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between gap-space-md p-space-lg"
            >
              <div class="min-w-none">
                <p class="text-sm font-medium">
                  {{ session.current ? 'This session' : 'Browser session' }}
                </p>
                <p
                  :title="session.userAgent"
                  class="mt-space-xs max-w-field truncate text-xs text-muted"
                >
                  {{ session.userAgent }}
                </p>
                <p class="mt-space-xs text-xs text-muted">
                  Started {{ new Date(session.createdAt).toLocaleString() }}
                </p>
              </div>
              <UButton
                label="Revoke"
                size="sm"
                color="neutral"
                variant="outline"
                :disabled="busy"
                @click="revoke(session)"
              />
            </li>
          </ul>
        </ContentPanel>
      </div>
    </div>
  </WorkspacePage>
</template>
