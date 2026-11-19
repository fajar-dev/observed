<script setup lang="ts">
import { languages, dataSourceSchema } from '#shared/domain/data-source'

const configuration = useConfiguration()
const { busy, error, open, editing, clearSecret, save } = configuration
const form = toRef(configuration, 'form')
const languageOptions = computed(() => languages.map(value => ({ label: value === 'flux' ? 'Flux · InfluxDB 2.x' : 'InfluxQL · Compatible API', value })))
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="editing ? 'Edit data source' : 'Add data source'"
    description="Configure an InfluxDB connection."
    save-label="Save data source"
    :schema="dataSourceSchema"
    :state="form"
    :busy="busy"
    @save="save"
  >
    <RequestError :message="error" />
    <UFormField
      name="name"
      label="Name"
      required
    >
      <UInput
        v-model="form.name"
        size="sm"
        class="w-full"
        placeholder="Production InfluxDB"
      />
    </UFormField>
    <UFormField
      name="url"
      label="URL"
      required
    >
      <UInput
        v-model="form.url"
        size="sm"
        class="w-full"
        placeholder="http://localhost:8086"
      />
    </UFormField>
    <UFormField
      name="queryLanguage"
      label="Query language"
    >
      <USelect
        v-model="form.queryLanguage"
        size="sm"
        :items="languageOptions"
        class="w-full"
      />
    </UFormField>
    <div class="grid gap-space-lg sm:grid-cols-pair">
      <UFormField
        v-if="form.queryLanguage === 'flux'"
        name="organization"
        label="Organization"
        required
      >
        <UInput
          v-model="form.organization"
          size="sm"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="database"
        :label="form.queryLanguage === 'flux' ? 'Default bucket' : 'Database'"
        required
      >
        <UInput
          v-model="form.database"
          size="sm"
          class="w-full"
        />
      </UFormField>
    </div>
    <section class="space-y-space-md border-t border-default pt-space-lg">
      <h2 class="text-sm font-medium text-highlighted">
        Authentication
      </h2>
      <UFormField
        v-if="form.queryLanguage === 'influxql'"
        name="username"
        label="Username"
        help="Leave blank to use token authentication."
      >
        <UInput
          v-model="form.username"
          size="sm"
          class="w-full"
          autocomplete="off"
        />
      </UFormField>
      <UFormField
        name="secret"
        :label="form.queryLanguage === 'influxql' && form.username ? 'Password' : 'API token'"
        :hint="editing?.hasSecret ? 'Saved credential' : undefined"
        :help="editing?.hasSecret ? 'Leave blank to keep the current credential.' : undefined"
      >
        <UInput
          v-model="form.secret"
          size="sm"
          class="w-full"
          type="password"
          autocomplete="new-password"
          :disabled="clearSecret"
        />
      </UFormField>
      <UCheckbox
        v-if="editing?.hasSecret"
        v-model="clearSecret"
        label="Remove saved credential"
      />
    </section>
  </FormDialog>
</template>
