<script setup lang="ts">
import { product } from '#shared/config/product'

const image = new URL(product.logo, useRequestURL().origin).href
useSeoMeta({ ogImage: image, ogImageAlt: 'Observed — Structural Health Monitoring', twitterImage: image, twitterImageAlt: 'Observed — Structural Health Monitoring' })
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', progress: false, duration: 5000, max: 3 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
