import { apiErrorStatus } from './api-error'

export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown>, signal?: AbortSignal }
export type ApiFetcher = <T>(path: string, options?: RequestOptions) => Promise<T>
const publicAuthPaths = new Set(['auth/session', 'auth/config', 'auth/refresh', 'auth/sign-in', 'auth/setup', 'auth/sign-out'])

export class WorkspaceApi {
  constructor(private readonly fetcher: ApiFetcher, private readonly renew: () => Promise<void>, private readonly expired: () => Promise<void>) {}

  renewSession() { return this.renew() }

  async request<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = '/api/observe/' + path
    try {
      return await this.fetcher<T>(url, options)
    } catch (error) {
      if (apiErrorStatus(error) !== 401 || publicAuthPaths.has(path) || options?.signal?.aborted) throw error
      try {
        await this.renew()
        return await this.fetcher<T>(url, options)
      } catch (failure) {
        if (apiErrorStatus(failure) === 401) await this.expired()
        throw failure
      }
    }
  }
}
