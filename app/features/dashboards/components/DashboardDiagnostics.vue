<script setup lang="ts">
import type { Dashboard, DashboardDiagnostic, DashboardDefinition } from '#shared/domain/dashboard'

const apiRequest = useApiRequest()
const { canEditDashboard } = useAccessPermissions()

const props = defineProps<{ dashboard: DashboardDefinition & { id: string } }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ repaired: [dashboard: Dashboard] }>()
const { data: sources } = useDataSources()
const { busy, error, perform } = useAsyncAction()
const diagnostics = ref<DashboardDiagnostic>()
const dataSourceId = ref(props.dashboard.panels.find(panel => panel.dataSourceId)?.dataSourceId ?? sources.value[0]?.id ?? '')
const restorePanelOptions = ref(false)
const sourceItems = computed(() => sources.value.map(source => ({ label: source.name, value: source.id })))
const stateClasses = { ready: 'text-success', empty: 'text-warning', error: 'text-error', unconfigured: 'text-muted' }
const colors = { ready: 'success', empty: 'warning', error: 'error', unconfigured: 'neutral' } as const
async function check() {
  await perform(async () => {
    diagnostics.value = await apiRequest('dashboards/' + props.dashboard.id + '/diagnostics', { method: 'POST' })
  })
}
async function repair() {
  await perform(async () => {
    const dashboard = await apiRequest<Dashboard>('dashboards/' + props.dashboard.id + '/restore-import', {
      method: 'POST', body: { dataSourceId: dataSourceId.value || null, restorePanelOptions: restorePanelOptions.value }
    })
    emit('repaired', dashboard)
    diagnostics.value = undefined
    open.value = false
  })
}
watch(open, (value) => {
  if (value) void check()
})
useErrorToast(() => open.value ? error.value : '', 'Dashboard check failed')

useNotice(() => open.value && diagnostics.value && Object.keys(diagnostics.value.variables.errors).length
  ? {
      title: 'Variable issues',
      description: Object.values(diagnostics.value.variables.errors).join(' '),
      color: 'warning'
    }
  : undefined)
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Dashboard health"
    description="Check data source mappings, variable queries, and the results of every panel."
    :ui="{ content: 'sm:max-w-modal' }"
  >
    <template #body>
      <div class="space-y-space-lg">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">{{ dashboard.panels.length }} panels</span><UButton
            size="sm"
            label="Run checks"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="busy"
            @click="check"
          />
        </div>
        <USkeleton
          v-if="busy && !diagnostics"
          class="h-field-sm"
        />
        <template v-if="diagnostics">
          <div class="grid grid-cols-pair gap-space-sm sm:grid-cols-quartet">
            <div
              v-for="state in ['ready', 'empty', 'error', 'unconfigured'] as const"
              :key="state"
              class="rounded-md border border-default p-space-md"
            >
              <p class="text-xs text-muted">
                {{ state }}
              </p><p
                class="mt-space-xs text-xl font-medium"
                :class="stateClasses[state]"
              >
                {{ diagnostics.panels.filter(panel => panel.status === state).length }}
              </p>
            </div>
          </div>
          <div
            v-for="panel in diagnostics.panels"
            :key="panel.id"
            class="border-b border-default pb-space-md"
          >
            <div class="flex items-center justify-between gap-space-md">
              <p class="text-sm font-medium text-highlighted">
                {{ panel.title }}
              </p><UBadge
                :label="panel.status"
                :color="colors[panel.status]"
                variant="soft"
              />
            </div>
            <p class="mt-space-xs text-xs text-muted">
              {{ panel.message || panel.rows.toLocaleString() + ' rows returned' }}
            </p>
          </div>
        </template>
        <section
          v-if="dashboard.importMetadata?.sourceDocument && canEditDashboard(dashboard.id)"
          class="surface space-y-space-lg p-space-lg"
        >
          <h2 class="font-semibold text-highlighted">
            Repair a Grafana import
          </h2>
          <p class="text-xs leading-normal text-muted">
            Reload the original variable definitions and reconnect missing data sources. The repair is saved as a new version. Enable appearance restoration to reload the original sizes, colors, units, legend, and tables.
          </p>
          <UFormField label="InfluxDB data source">
            <USelect
              v-model="dataSourceId"
              size="sm"
              :items="sourceItems"
              class="w-full"
              placeholder="Choose a data source"
            />
          </UFormField>
          <USwitch
            v-model="restorePanelOptions"
            label="Restore original Grafana appearance"
            description="Replace panel layout and visual options with the saved Grafana configuration."
          />
          <UButton
            size="sm"
            label="Repair import"
            icon="i-lucide-wrench"
            :loading="busy"
            :disabled="!dataSourceId"
            @click="repair"
          />
        </section>
      </div>
    </template>
  </USlideover>
</template>
