<template>
  <UApp :toaster="{ position: 'bottom-right', progress: false, duration: 5000, max: 3 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
