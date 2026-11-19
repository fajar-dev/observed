import type { QueryRequest, QueryResponse } from '#shared/domain/query'

export function useQueryRunner() {
  const executeQuery = useQueryExecution()
  const results = shallowRef<QueryResponse[]>([])
  const failures = ref<string[]>([])
  const loading = ref(false)
  let controller: AbortController | undefined
  let generation = 0

  function cancel() {
    generation++
    controller?.abort()
    loading.value = false
  }

  async function run(inputs: QueryRequest[]) {
    cancel()
    if (!inputs.length) {
      results.value = []
      failures.value = []
      return
    }
    const current = generation
    controller = new AbortController()
    loading.value = true
    const responses = await Promise.allSettled(inputs.map(input => executeQuery(input, controller!.signal)))
    if (current !== generation) return
    results.value = responses.flatMap(response => response.status === 'fulfilled' ? [response.value] : [])
    failures.value = responses.flatMap((response, index) => response.status === 'rejected' ? ['Query ' + String.fromCharCode(65 + index) + ' · ' + apiErrorMessage(response.reason)] : [])
    loading.value = false
  }

  onScopeDispose(cancel)
  return { results, failures, loading, run, cancel }
}
