<script setup lang="ts">
import { allVariableValue } from '#shared/utils/dashboard-variables'

const { draft, sources, variables, variablesLoading, selectVariable } = useDashboardEditor()
</script>

<template>
  <div
    v-if="draft.variables?.some(variable => !variable.hidden)"
    class="dashboard-variables"
  >
    <div class="flex flex-wrap items-center gap-space-lg">
      <UFormField
        v-for="variable in draft.variables?.filter(variable => !variable.hidden)"
        :key="variable.name"
        :label="variable.label || variable.name"
        class="dashboard-variable min-w-none max-w-full"
      >
        <USelectMenu
          v-if="variable.multi"
          :placeholder="'Select ' + (variable.label || variable.name).toLowerCase()"
          :model-value="Array.isArray(variables[variable.name]) ? variables[variable.name] as string[] : [String(variables[variable.name] ?? variable.current)].filter(Boolean)"
          :items="[{ label: 'All', value: allVariableValue }, ...variable.values.map(value => ({ label: value, value }))].filter(item => variable.includeAll || item.value !== allVariableValue)"
          value-key="value"
          multiple
          :aria-label="variable.label || variable.name"
          :loading="variablesLoading"
          class="w-field-sm max-w-full"
          @update:model-value="selectVariable(variable, $event)"
        />
        <UInput
          v-else-if="variable.type === 'textbox'"
          :placeholder="'Enter ' + (variable.label || variable.name).toLowerCase()"
          :model-value="String(variables[variable.name] ?? variable.current)"
          :aria-label="variable.label || variable.name"
          class="w-field-sm max-w-full"
          @update:model-value="variables[variable.name] = String($event)"
        />
        <USelect
          v-else
          :placeholder="'Select ' + (variable.label || variable.name).toLowerCase()"
          :model-value="String(variables[variable.name] ?? variable.current)"
          :items="variable.values.map(value => ({ label: variable.type === 'datasource' ? sources.find(source => source.id === value)?.name ?? value : value, value }))"
          :aria-label="variable.label || variable.name"
          :loading="variablesLoading"
          class="w-field-sm max-w-full"
          @update:model-value="selectVariable(variable, $event)"
        />
      </UFormField>
    </div>
  </div>
</template>
