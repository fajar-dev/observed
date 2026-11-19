<template>
  <NuxtLink
    to="/"
    class="shrink-none rounded-md focus-visible:outline-medium focus-visible:outline-primary"
    aria-label="AMTI overview"
  >
    <picture class="block h-control-sm w-control-sm lg:h-logo-height lg:w-logo dark:hidden">
      <source
        media="(min-width: 64rem)"
        srcset="/logo-full.png"
      >
      <img
        src="/logo.png"
        alt="AMTI"
        class="size-full object-contain object-left"
      >
    </picture>
    <picture class="hidden h-control-sm w-control-sm lg:h-logo-height lg:w-logo dark:block">
      <source
        media="(min-width: 64rem)"
        srcset="/logo-full-light.png"
      >
      <img
        src="/logo-light.png"
        alt="AMTI"
        class="size-full object-contain object-left"
      >
    </picture>
  </NuxtLink>
</template>
