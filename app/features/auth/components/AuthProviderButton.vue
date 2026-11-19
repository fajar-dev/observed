<script setup lang="ts">
import type { AuthProvider } from '#shared/domain/auth'

defineProps<{ provider: AuthProvider }>()
const labels = { google: 'Google', microsoft: 'Microsoft' }
</script>

<template>
  <UButton
    :href="'/api/observe/auth/oauth/' + provider"
    external
    :aria-label="'Continue with ' + labels[provider]"
    size="md"
    color="neutral"
    variant="outline"
    block
  >
    <template #leading>
      <svg
        v-if="provider === 'microsoft'"
        viewBox="0 0 20 20"
        class="size-icon-md shrink-none"
        aria-hidden="true"
      >
        <path
          fill="#f25022"
          d="M0 0h9v9H0z"
        /><path
          fill="#7fba00"
          d="M11 0h9v9h-9z"
        />
        <path
          fill="#00a4ef"
          d="M0 11h9v9H0z"
        /><path
          fill="#ffb900"
          d="M11 11h9v9h-9z"
        />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        class="size-icon-md shrink-none"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.509h3.232c1.891-1.741 2.981-4.305 2.981-7.35Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.964-.895 6.619-2.423l-3.232-2.509c-.895.6-2.041.955-3.387.955-2.605 0-4.81-1.76-5.596-4.123H3.064v2.591A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.404 13.9A6 6 0 0 1 6.091 12c0-.659.113-1.3.313-1.9V7.509H3.064A10 10 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491l3.34-2.591Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.695 2 12 2a10 10 0 0 0-8.936 5.509L6.404 10.1C7.191 7.736 9.395 5.977 12 5.977Z"
        />
      </svg>
    </template>
    <span><span class="auth-provider-prefix">Continue with </span>{{ labels[provider] }}</span>
  </UButton>
</template>
