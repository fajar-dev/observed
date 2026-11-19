<template>
  <main class="auth-layout">
    <header class="auth-brand">
      <WorkspaceBrand />
      <span class="border-s border-default ps-space-lg text-heading font-medium tracking-tight text-highlighted">Observe</span>
    </header>
    <UColorModeButton
      class="auth-theme"
      color="neutral"
      variant="ghost"
      aria-label="Change appearance"
    />
    <aside
      class="auth-story"
      aria-label="About AMTI Observe"
    >
      <div class="auth-story-content">
        <p class="auth-eyebrow">
          Monitor. Understand. Act.
        </p>
        <h2 class="auth-headline">
          Your infrastructure,<br><span class="text-primary">in focus.</span>
        </h2>
        <p class="auth-story-description">
          From live metrics to the alerts that matter.<br>One workspace to see the whole picture.
        </p>
        <AuthIllustration />
      </div>
      <ul class="auth-features">
        <li><UIcon name="i-lucide-database" />InfluxDB sources</li>
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
