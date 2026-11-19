import type { Ref } from 'vue'
import type { DataSource } from '#shared/domain/data-source'
import type { QueryRequest } from '#shared/domain/query'
import { InfluxQueryBuilder } from '#shared/domain/query-builder'
import { starterQuery } from '#shared/domain/query'

export function useQueryBuilder(props: Readonly<{ source?: DataSource, range: QueryRequest['range'] }>, query: Ref<string>) {
  const executeQuery = useQueryExecution()
  const mode = ref(query.value.trim() ? 'code' : 'builder')
  const measurement = ref('')
  const field = ref('')
  const aggregation = ref('mean')
  const measurements = ref<string[]>([])
  const fields = ref<string[]>([])
  const tags = ref<{ key: string, value: string }[]>([])
  const tagKeys = ref<string[]>([])
  const busy = ref(false)
  const error = ref('')
  const lines = computed(() => Math.max(5, query.value.split('\n').length))
  let discovery = 0
  let controller: AbortController | undefined

  function reset() {
    discovery++
    controller?.abort()
    measurement.value = ''
    field.value = ''
    measurements.value = []
    fields.value = []
    tags.value = []
    tagKeys.value = []
    error.value = ''
    busy.value = false
  }

  watch(() => props.source?.id, () => {
    reset()
    if (mode.value === 'builder' && props.source) void discover('measurement')
  })
  watch(measurement, () => {
    field.value = ''
    fields.value = []
    if (measurement.value && props.source) void discover('field')
  })
  watch([measurement, field, aggregation, tags], () => {
    if (mode.value === 'builder') generate()
  }, { deep: true })
  watch(mode, (value) => {
    if (value === 'builder' && !measurements.value.length && props.source) void discover('measurement')
  })
  onMounted(() => {
    if (mode.value === 'builder' && props.source) void discover('measurement')
  })

  async function discover(kind: 'measurement' | 'field') {
    const source = props.source
    if (!source) return
    controller?.abort()
    controller = new AbortController()
    const request = ++discovery
    const selected = measurement.value
    const statement = new InfluxQueryBuilder(source.queryLanguage).metadata(kind, selected)
    busy.value = true
    error.value = ''
    try {
      const result = await executeQuery({ query: statement, dataSourceId: source.id, range: props.range }, controller.signal)
      if (request !== discovery || props.source?.id !== source.id) return
      const values = [...new Set(result.rows.flatMap((row) => {
        const value = row._value ?? row[kind === 'measurement' ? 'name' : 'fieldKey']
        return typeof value === 'string' ? [value] : []
      }))].sort()
      if (kind === 'measurement') measurements.value = values
      else {
        fields.value = values
        const tagResult = await executeQuery({ query: new InfluxQueryBuilder(source.queryLanguage).metadata('tag', selected), dataSourceId: source.id, range: props.range }, controller.signal).catch(() => undefined)
        if (request === discovery && props.source?.id === source.id) tagKeys.value = [...new Set(tagResult?.rows.flatMap(row => typeof (row._value ?? row.tagKey) === 'string' ? [String(row._value ?? row.tagKey)] : []) ?? [])].sort()
      }
      if (!values.length) error.value = 'No values found in this time range. You can also enter a value manually.'
    } catch (failure) {
      if (request === discovery) error.value = apiErrorMessage(failure)
    } finally {
      if (request === discovery) busy.value = false
    }
  }

  function generate() {
    if (!measurement.value || !field.value || !props.source) return
    query.value = new InfluxQueryBuilder(props.source.queryLanguage).build({ measurement: measurement.value, field: field.value, aggregation: aggregation.value, tags: tags.value })
  }

  function useStarter() {
    if (props.source) query.value = starterQuery(props.source)
  }
  onScopeDispose(() => {
    controller?.abort()
  })

  return { mode, measurement, field, aggregation, measurements, fields, tags, tagKeys, busy, error, lines, discover, generate, useStarter }
}
