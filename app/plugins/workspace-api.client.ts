import { WorkspaceApi } from '~/core/http/workspace-api'
import { SessionRenewal } from '~/core/http/session-renewal'

export default defineNuxtPlugin<{ workspaceApi: WorkspaceApi }>((app) => {
  let expiring: Promise<void> | undefined
  const fetcher = <T>(path: string, options?: import('~/core/http/workspace-api').RequestOptions) => $fetch<T>(path, options) as Promise<T>
  const renewal = new SessionRenewal(fetcher, action => import.meta.client && navigator.locks ? navigator.locks.request('observe-refresh', action) : action())
  function expired(): Promise<void> {
    expiring ??= app.runWithContext(async () => {
      useState('auth-user').value = null
      clearNuxtData()
      if (useRoute().path !== '/sign-in') await navigateTo('/sign-in')
    }).finally(() => { expiring = undefined })
    return expiring
  }
  return { provide: { workspaceApi: new WorkspaceApi(fetcher, () => renewal.renew(), expired) } }
})
