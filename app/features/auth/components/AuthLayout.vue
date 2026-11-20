<template>
  <main class="auth-layout">
    <header class="auth-brand">
      <WorkspaceBrand />
      <span class="border-s border-default ps-space-lg text-heading font-medium tracking-tight text-highlighted">Observed</span>
    </header>
    <UColorModeButton
      class="auth-theme"
      color="neutral"
      variant="ghost"
      aria-label="Change appearance"
    />
    <aside
      class="auth-story"
      aria-label="About Observed"
    >
      <div class="auth-story-content">
        <p class="auth-eyebrow">
          Structural Health Monitoring
        </p>
        <h2 class="auth-headline">
          Understand your<br><span class="text-primary">structures.</span>
        </h2>
        <p class="auth-story-description">
          Custom sensor dashboards for buildings, bridges,<br>and the structures you care for.
        </p>
        <AuthIllustration />
      </div>
      <ul class="auth-features">
        <li><UIcon name="i-lucide-activity" />Sensor metrics</li>
        <li><UIcon name="i-lucide-layout-dashboard" />Custom dashboards</li>
        <li><UIcon name="i-lucide-bell" />Telegram alerts</li>
      </ul>
    </aside>
    <section
      class="auth-entry"
      aria-labelledby="auth-title"
    >
      <div class="auth-form-container">
        <slot />
      </div>
    </section>
  </main>
</template>
