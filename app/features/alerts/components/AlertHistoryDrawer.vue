<script setup lang="ts">
const { historyOpen, editing } = useAlertRules()
</script>

<template>
  <USlideover
    v-model:open="historyOpen"
    :title="editing?.name ?? 'Evaluation history'"
  >
    <template #body>
      <UEmpty
        v-if="!editing?.evaluationHistory?.length"
        title="No evaluation history yet"
        size="sm"
      /><div
        v-for="(evaluation, index) in editing?.evaluationHistory"
        :key="index"
        class="flex justify-between gap-space-md border-b border-default py-space-lg"
      >
        <div>
          <p class="text-xs text-muted">
            {{ new Date(evaluation.time).toLocaleString('en') }}
          </p><p
            v-if="evaluation.value !== null"
            class="mt-space-xs text-sm text-highlighted"
          >
            Value {{ evaluation.value.toLocaleString('en') }}
          </p><p
            v-if="evaluation.message || evaluation.deliveryError"
            class="mt-space-xs text-xs text-error"
          >
            {{ evaluation.message || evaluation.deliveryError }}
          </p>
        </div><UBadge
          :label="evaluation.state"
          :color="evaluation.state === 'firing' ? 'error' : evaluation.state === 'normal' ? 'success' : 'warning'"
          variant="soft"
          class="self-start"
        />
      </div>
    </template>
  </USlideover>
</template>
