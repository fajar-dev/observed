<script setup lang="ts">
import { z } from 'zod'
import { name } from '#shared/domain/common'

const { sectionOpen, sectionId, sectionForm, saveSection } = useDashboardEditor()
const schema = z.object({ title: name })
</script>

<template>
  <UModal
    v-model:open="sectionOpen"
    :title="sectionId ? 'Rename row' : 'Add row'"
    description="Group related panels in a row that can be collapsed."
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="sectionForm"
        class="flex flex-col gap-space-lg"
        @submit="saveSection"
      >
        <UFormField
          label="Row title"
          name="title"
          required
        >
          <UInput
            v-model="sectionForm.title"
            class="w-full"
            autofocus
            placeholder="Strain and displacement"
          />
        </UFormField>
        <div class="flex justify-end gap-space-sm">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="sectionOpen = false"
          />
          <UButton
            :label="sectionId ? 'Save row' : 'Add row'"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
