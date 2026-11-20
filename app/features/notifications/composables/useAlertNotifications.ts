import type { AlertNotification, NotificationSnapshot } from '#shared/domain/notification'

export function useAlertNotifications() {
  const snapshot = useState<NotificationSnapshot>('alert-notifications', () => ({ items: [], unread: 0, cursor: '0' }))
  const loading = useState('alert-notifications-loading', () => true)
  const api = useApiRequest()
  const { busy, perform, error: actionError } = useAsyncAction()
  useErrorToast(actionError, 'Could not update notifications')
  async function markRead(notification?: AlertNotification) {
    await perform(async () => {
      await api('notifications/read', { method: 'POST', body: notification ? { id: notification.id } : { through: snapshot.value.cursor } })
      snapshot.value = await api<NotificationSnapshot>('notifications')
    })
  }
  return { snapshot, loading, busy, markRead }
}
