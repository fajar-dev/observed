import { canAccessModule, canAccessResource } from '#shared/domain/permissions'
import type { AuthUser } from '#shared/domain/auth'
import type { NotificationSnapshot } from '#shared/domain/notification'
import { NotificationStream } from '~/features/notifications/utils/notification-stream'

export default defineNuxtPlugin((app) => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const snapshot = useState<NotificationSnapshot>('alert-notifications', () => ({ items: [], unread: 0, cursor: '0' }))
  const loading = useState('alert-notifications-loading', () => true)
  const toast = useNotifications()
  watch(() => user.value?.id, (id, _previous, cleanup) => {
    snapshot.value = { items: [], unread: 0, cursor: '0' }
    loading.value = !!id
    if (!id) return
    const controller = new AbortController()
    const seen = new Set<string>()
    const toastIds = new Set<string | number>()
    const stream = new NotificationStream(app.$workspaceApi, (update) => {
      if (controller.signal.aborted) return
      snapshot.value = { items: update.items, unread: update.unread, cursor: update.cursor }
      loading.value = false
      const changed = update.events.some(item => !seen.has(item.id))
      if (changed && canAccessModule(user.value, 'alerts')) void app.runWithContext(() => refreshNuxtData('observe:alert-rules'))
      for (const item of update.events) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        if (seen.size > 500) seen.delete(seen.values().next().value!)
        if (item.readAt) continue
        const notice = toast.add({
          title: `${item.state === 'firing' ? 'Firing' : 'Recovered'} · ${item.alertName}`,
          description: `${item.sourceName} · Current ${item.value ?? '—'} · Threshold ${{ gt: '>', gte: '≥', lt: '<', lte: '≤' }[item.operator]} ${item.threshold}`,
          color: item.state === 'recovered' ? 'success' : 'error',
          actions: canAccessResource(user.value, 'alerts', item.alertRuleId) ? [{ label: 'View alerts', to: '/alerts' }] : undefined
        })
        toastIds.add(notice.id)
        if (toastIds.size > 500) toastIds.delete(toastIds.values().next().value!)
      }
    })
    void stream.run(controller.signal)
    cleanup(() => {
      controller.abort()
      for (const id of toastIds) toast.remove(id)
      toastIds.clear()
    })
  }, { immediate: true })
})
