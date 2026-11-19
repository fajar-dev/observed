import type { AlertRule } from '#shared/domain/alert-rule'
import type { Dashboard } from '#shared/domain/dashboard'
import type { QueryRequest, QueryResponse } from '#shared/domain/query'
import type { DataSource } from '#shared/domain/data-source'
import type { TelegramDestination } from '#shared/domain/telegram-destination'

export function apiRequest<T>(path: string, options?: { method: 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown> }) {
  return useNuxtApp().$workspaceApi.request<T>(path, options)
}

function useResourceCollection<T>(path: string) {
  const state = useAsyncData<T[]>('observe:' + path, () => apiRequest<T[]>(path), {
    server: false,
    immediate: false,
    default: () => [] as T[]
  })
  onMounted(() => {
    if (state.status.value !== 'pending') void state.execute()
  })
  return state
}

export function useDataSources() {
  return useResourceCollection<DataSource>('data-sources')
}

export function useDashboards() {
  return useResourceCollection<Dashboard>('dashboards')
}

export function useAlertRuleRecords() {
  return useResourceCollection<AlertRule>('alert-rules')
}

export function executeQuery(input: QueryRequest) {
  return apiRequest<QueryResponse>('queries', { method: 'POST', body: input })
}

export function apiErrorMessage(error: unknown) {
  const failure = error as { data?: { data?: { message?: string }, statusMessage?: string }, statusMessage?: string, message?: string } | null
  return failure?.data?.data?.message || failure?.data?.statusMessage || failure?.statusMessage || failure?.message || 'Something went wrong.'
}

export function useAsyncAction() {
  const busy = ref(false)
  const error = ref('')
  async function perform<T>(action: () => Promise<T>) {
    if (busy.value) return undefined
    busy.value = true
    error.value = ''
    try {
      return await action()
    } catch (failure) {
      error.value = apiErrorMessage(failure)
    } finally {
      busy.value = false
    }
  }
  return { busy, error, perform }
}

export function useTelegramDestinations() {
  return useResourceCollection<TelegramDestination>('telegram-destinations')
}

export function useDashboardFolders() {
  return useResourceCollection<import('#shared/domain/dashboard').Folder>('dashboard-folders')
}
