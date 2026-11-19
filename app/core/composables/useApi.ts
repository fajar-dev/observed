import type { RequestOptions } from '~/core/http/workspace-api'

export { apiErrorMessage, apiErrorStatus } from '~/core/http/api-error'

export function useApiRequest() {
  const api = useNuxtApp().$workspaceApi
  return <T>(path: string, options?: RequestOptions) => api.request<T>(path, options)
}
