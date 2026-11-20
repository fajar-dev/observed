<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const missing = computed(() => props.error.statusCode === 404)
const forbidden = computed(() => props.error.statusCode === 403)
usePageSeo(() => missing.value ? 'Page not found' : forbidden.value ? 'Access denied' : 'Unable to load page')
</script>

<template>
  <UApp>
    <main class="flex min-h-dvh items-center justify-center bg-default p-space-xl text-default">
      <div class="max-w-summary text-center">
        <p class="font-mono text-status tracking-tight text-dimmed">
          {{ error.statusCode || 500 }}
        </p>
        <h1 class="mt-space-sm text-title font-semibold tracking-tight text-highlighted">
          {{ missing ? 'Page not found' : forbidden ? 'Access denied' : 'Unable to load this page' }}
        </h1>
        <p class="mt-space-sm text-sm text-muted">
          {{ missing ? 'The page you are looking for does not exist.' : forbidden ? 'You do not have permission to view this page. Ask an administrator for access.' : 'Please try again or return to the overview.' }}
        </p>
        <UButton
          size="sm"
          label="Back to overview"
          color="neutral"
          variant="outline"
          class="mt-space-xl"
          @click="clearError({ redirect: '/' })"
        />
      </div>
    </main>
  </UApp>
</template>
