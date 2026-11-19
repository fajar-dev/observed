const resourceFreshnessMs = 30_000

/** A collection is shared across consumers; mounting another panel does not start another fetch. */
export function useResourceCollection<T>(path: string) {
  const apiRequest = useApiRequest()
  const attempts = useState<Record<string, number>>('resource-fetch-times', () => ({}))
  const state = useAsyncData<T[]>('observe:' + path, async () => {
    attempts.value[path] = Date.now()
    return apiRequest<T[]>(path)
  }, { server: false, immediate: false, default: () => [] as T[], dedupe: 'defer' })
  onMounted(() => {
    const stale = Date.now() - (attempts.value[path] ?? 0) > resourceFreshnessMs
    if (state.status.value === 'idle' || (stale && state.status.value !== 'pending')) void state.execute()
  })
  return state
}
