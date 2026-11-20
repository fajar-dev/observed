<script setup lang="ts">
const { form, destinationOptions } = useAlertRules()
</script>

<template>
  <aside class="min-w-none border-l border-default bg-default">
    <div class="space-y-space-lg p-space-lg">
      <section class="space-y-space-md">
        <h2 class="text-sm font-semibold text-highlighted">
          Rule settings
        </h2>
        <UFormField
          name="name"
          label="Rule name"
          required
        >
          <UInput
            v-model="form.name"
            size="sm"
            placeholder="Pier tilt above threshold"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="summary"
          label="Summary"
        >
          <UTextarea
            v-model="form.summary"
            :rows="3"
            placeholder="Describe the sensor location and what your team should check."
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="severity"
          label="Severity"
        >
          <USelect
            v-model="form.severity"
            size="sm"
            :items="['critical', 'warning', 'info']"
            class="w-full"
          />
        </UFormField>
      </section>
      <section class="space-y-space-md border-t border-default pt-space-lg">
        <h2 class="text-sm font-semibold text-highlighted">
          Evaluation
        </h2>
        <UFormField
          name="interval"
          label="Evaluate every (seconds)"
        >
          <UInput
            v-model.number="form.interval"
            size="sm"
            type="number"
            :min="30"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="pendingFor"
          label="Pending period (seconds)"
          help="Use 0 to fire immediately."
        >
          <UInput
            v-model.number="form.pendingFor"
            size="sm"
            type="number"
            :min="0"
            class="w-full"
          />
        </UFormField>
        <USwitch
          v-model="form.enabled"
          label="Enable scheduled evaluation"
        />
      </section>
      <section class="space-y-space-md border-t border-default pt-space-lg">
        <h2 class="text-sm font-semibold text-highlighted">
          Telegram notifications
        </h2>
        <UFormField
          name="telegramDestinationIds"
          label="Telegram destinations"
          required
        >
          <USelectMenu
            v-model="form.telegramDestinationIds"
            size="sm"
            :items="destinationOptions"
            value-key="value"
            multiple
            placeholder="Select Telegram destinations"
            class="w-full"
          />
        </UFormField>
        <UButton
          size="sm"
          label="Manage destinations"
          icon="i-lucide-settings"
          to="/configuration?section=telegram-destinations"
          color="neutral"
          variant="link"
        />
      </section>
    </div>
  </aside>
</template>
