import type { QueryRequest, QueryResponse } from '#shared/domain/query'

export function useQueryExecution() {
  const apiRequest = useApiRequest()
  return (input: QueryRequest, signal?: AbortSignal) => apiRequest<QueryResponse>('queries', { method: 'POST', body: input, signal })
}
