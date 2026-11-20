<script setup lang="ts">
import { signInSchema, setupSchema } from '#shared/domain/auth'

const { route, configuration, loadError, busy, error, form, settingUp, showPassword, submit } = useSignIn()
usePageSeo(() => settingUp.value ? 'Initial setup' : 'Sign in')
useErrorToast(() => loadError.value || error.value, 'Sign in failed')

useNotice(() => route.query.error === 'oauth'
  ? {
      title: 'Provider sign-in could not be completed',
      description: 'Try again. Existing accounts must link the provider from Profile. Contact an administrator if access is restricted.',
      color: 'error'
    }
  : undefined)
</script>

<template>
  <AuthLayout>
    <div class="auth-form-content">
      <div class="auth-form-heading">
        <UIcon
          name="i-lucide-fingerprint"
          class="size-icon-xl text-primary"
        />
        <h1
          id="auth-title"
          class="auth-form-title"
        >
          {{ settingUp ? 'Set up Observed' : 'Welcome back.' }}
        </h1>
        <p class="auth-form-description">
          {{ settingUp ? 'Create an administrator account for your structural monitoring team.' : 'Access your sensor dashboards, structural trends, and monitoring alerts.' }}
        </p>
      </div>
      <UForm
        v-if="configuration"
        :schema="settingUp ? setupSchema : signInSchema"
        :state="form"
        class="auth-form"
        :class="settingUp ? 'auth-form-setup' : undefined"
        @submit="submit"
      >
        <UFormField
          v-if="settingUp"
          name="name"
          label="Name"
          required
        >
          <UInput
            v-model="form.name"
            placeholder="Your name"
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
          class="auth-field-password"
          name="password"
          label="Password"
          :help="settingUp ? 'At least 12 characters.' : undefined"
          required
        >
          <UInput
            v-model="form.password"
            placeholder="Enter your password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="settingUp ? 'new-password' : 'current-password'"
            class="w-full"
            :ui="{ trailing: 'pe-space-xs' }"
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                type="button"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
        <UButton
          class="auth-submit"
          type="submit"
          size="md"
          :label="settingUp ? 'Create administrator' : 'Sign in'"
          block
          :loading="busy"
        />
      </UForm>
      <template v-if="!settingUp && configuration?.providers.length">
        <USeparator label="OR" />
        <div class="auth-providers">
          <AuthProviderButton
            v-for="provider in configuration.providers"
            :key="provider"
            :provider="provider"
          />
        </div>
      </template>
    </div>
  </AuthLayout>
</template>
