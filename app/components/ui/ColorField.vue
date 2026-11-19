<script setup lang="ts">
const color = defineModel<string>({ required: true })
withDefaults(defineProps<{ label?: string }>(), { label: 'Choose color' })
const emit = defineEmits<{ change: [value: string] }>()
function update(value: string | undefined) {
  if (!value) return
  color.value = value
  emit('change', value)
}
</script>

<template>
  <UPopover>
    <UButton
      :label="color"
      :aria-label="label"
      color="neutral"
      variant="outline"
      class="font-mono"
    >
      <template #leading>
        <span
          class="size-icon-sm rounded-sm ring ring-default"
          :style="{ backgroundColor: color }"
        />
      </template>
    </UButton>
    <template #content>
      <UColorPicker
        :model-value="color"
        format="hex"
        class="p-space-lg"
        @update:model-value="update"
      />
    </template>
  </UPopover>
</template>
