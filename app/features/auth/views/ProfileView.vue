<script setup lang="ts">
import { profileSchema } from '#shared/domain/auth'

usePageSeo('Profile', 'Manage your Observed account, sign-in methods, and active sessions.')

const { auth, route, configuration, linked, sessions, busy, error, loadError, form, state, save, revoke, preferencesBusy, setRealtimeAlertToasts, sessionsStatus } = useProfile()
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
    <div class="space-y-space-lg">
      <ContentPanel title="Account">
        <UForm
          :schema="profileSchema"
          :state="state"
          class="space-y-space-lg p-space-lg"
          @submit="save"
        >
          <div class="grid gap-space-lg sm:grid-cols-pair">
            <UFormField label="Email">
              <UInput
                placeholder="Your email address"
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
                placeholder="Your full name"
                autocomplete="name"
                class="w-full"
              />
            </UFormField>
          </div>
          <div
            v-if="auth.user.value?.hasPassword"
            class="grid items-start gap-space-lg sm:grid-cols-pair"
          >
            <UFormField
              name="currentPassword"
              label="Current password"
            >
              <UInput
                v-model="form.currentPassword"
                placeholder="Enter your current password"
                type="password"
                autocomplete="current-password"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="password"
              label="New password"
              help="Changing your password signs out all sessions."
            >
              <UInput
                v-model="form.password"
                placeholder="At least 12 characters"
                type="password"
                autocomplete="new-password"
                class="w-full"
              />
            </UFormField>
          </div>
          <UButton
            type="submit"
            label="Save changes"
            size="sm"
            :loading="busy"
            :disabled="preferencesBusy"
          />
        </UForm>
      </ContentPanel>
      <div
        class="grid gap-space-lg"
        :class="configuration?.providers.length ? 'lg:grid-cols-pair' : undefined"
      >
        <ContentPanel title="Notifications">
          <div class="p-space-lg">
            <USwitch
              :model-value="auth.user.value?.realtimeAlertToasts !== false"
              :disabled="busy || preferencesBusy"
              label="Alert pop-ups"
              description="Show alert updates on screen. Your inbox stays active."
              @update:model-value="setRealtimeAlertToasts"
            />
          </div>
        </ContentPanel>
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
                :label="provider === 'google' ? 'Connect Google' : 'Connect Microsoft'"
                color="neutral"
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </ContentPanel>
      </div>
      <ProfileSessions
        :sessions="sessions"
        :busy="busy"
        :loading="sessionsStatus === 'pending'"
        @revoke="revoke"
      />
    </div>
  </WorkspacePage>
</template>
