<script setup lang="ts">
type LogoOptions = {
  variant: 'compact' | 'full'
  width: number
  height: number
}

defineProps<{
  mobile: LogoOptions
  desktop: LogoOptions
}>()

const logoFiles = {
  compact: { light: '/logo.png', dark: '/logo-light.png' },
  full: { light: '/logo-full.png', dark: '/logo-full-light.png' }
}
</script>

<template>
  <span
    class="block h-(--logo-mobile-height) w-(--logo-mobile-width) lg:h-(--logo-desktop-height) lg:w-(--logo-desktop-width)"
    :style="{
      '--logo-mobile-width': `${mobile.width}px`,
      '--logo-mobile-height': `${mobile.height}px`,
      '--logo-desktop-width': `${desktop.width}px`,
      '--logo-desktop-height': `${desktop.height}px`
    }"
  >
    <picture class="block size-full dark:hidden">
      <source
        media="(min-width: 64rem)"
        :srcset="logoFiles[desktop.variant].light"
      >
      <img
        :src="logoFiles[mobile.variant].light"
        alt="AMTI"
        class="size-full object-contain"
      >
    </picture>
    <picture class="hidden size-full dark:block">
      <source
        media="(min-width: 64rem)"
        :srcset="logoFiles[desktop.variant].dark"
      >
      <img
        :src="logoFiles[mobile.variant].dark"
        alt="AMTI"
        class="size-full object-contain"
      >
    </picture>
  </span>
</template>
