import type { ToastProps } from '@nuxt/ui'
import type { MaybeRefOrGetter } from 'vue'

type Notice = {
  title: string
  description?: string
  color?: ToastProps['color']
  icon?: string
  actions?: ToastProps['actions']
}
const icons = {
  success: 'i-lucide-circle-check', error: 'i-lucide-circle-alert', warning: 'i-lucide-triangle-alert',
  info: 'i-lucide-info', primary: 'i-lucide-info', secondary: 'i-lucide-info', neutral: 'i-lucide-info'
}

export function useNotifications() {
  const toast = useToast()
  function add(notice: Notice) {
    const color = notice.color || 'info'
    return toast.add({ ...notice, color, icon: notice.icon || icons[color], progress: false, duration: 5000, close: true })
  }
  return { add, remove: toast.remove }
}

/** Watch message content so polling and rerenders do not repeatedly announce the same issue. */
export function useNotice(source: MaybeRefOrGetter<Notice | undefined>) {
  const { add, remove } = useNotifications()
  let previous = ''
  let currentId: string | number | undefined
  onMounted(() => {
    watch(() => toValue(source), (notice) => {
      if (!notice) {
        previous = ''
        if (currentId !== undefined) remove(currentId)
        currentId = undefined
        return
      }
      const signature = JSON.stringify([notice.title, notice.description, notice.color])
      if (signature === previous) return
      previous = signature
      if (currentId !== undefined) remove(currentId)
      currentId = add(notice).id
    }, { immediate: true })
  })
}

export function useErrorToast(source: MaybeRefOrGetter<unknown>, title = 'Request failed') {
  useNotice(() => {
    const message = toValue(source)
    return message ? { title, description: typeof message === 'string' ? message : apiErrorMessage(message), color: 'error' } : undefined
  })
}
