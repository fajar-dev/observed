export type RequestOptions = { method: 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown> }
export class WorkspaceApi {
  constructor(private readonly fetcher: typeof $fetch) {}
  request<T>(path: string, options?: RequestOptions) { return this.fetcher<T>(`/api/observe/${path}`, options) }
}
