import type { TelegramDestination, TelegramDestinationInput } from '#shared/domain/telegram-destination'

export function useTelegramDestinationsController() {
  const apiRequest = useApiRequest()
  const { data: destinations, error: loadError, refresh, status } = useTelegramDestinations()
  const { busy, error, perform } = useAsyncAction()
  const toast = useNotifications()
  const open = ref(false)
  const disconnect = ref(false)
  const editing = ref<TelegramDestination>()
  const testing = ref('')
  const search = ref('')
  const filteredDestinations = computed(() => destinations.value.filter(destination => `${destination.name} ${destination.chatId}`.toLowerCase().includes(search.value.trim().toLowerCase())))
  const form = reactive<TelegramDestinationInput>({ name: '', chatId: '', token: undefined })

  function edit(destination?: TelegramDestination) {
    editing.value = destination
    form.name = destination?.name ?? ''
    form.chatId = destination?.chatId ?? ''
    form.token = undefined
    error.value = ''
    open.value = true
  }

  function menu(destination: TelegramDestination) {
    return [
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => edit(destination) },
      { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => {
        editing.value = destination
        error.value = ''
        disconnect.value = true
      } }
    ]
  }

  async function save() {
    await perform(async () => {
      const id = editing.value?.id
      await apiRequest(id ? `telegram-destinations/${id}` : 'telegram-destinations', { method: id ? 'PUT' : 'POST', body: form })
      form.token = undefined
      open.value = false
      await refresh()
      toast.add({ title: 'Telegram destination saved', description: `You can select ${form.name} in your alert rules.`, color: 'success' })
    })
  }

  async function test(destination: TelegramDestination) {
    testing.value = destination.id
    try {
      await perform(async () => {
        await apiRequest(`telegram-destinations/${destination.id}/test`, { method: 'POST' })
        toast.add({ title: 'Test message sent', description: `A test notification was sent to ${destination.name}.`, color: 'success' })
      })
    } finally {
      testing.value = ''
    }
  }

  async function remove() {
    if (!editing.value) return
    const id = editing.value.id
    await perform(async () => {
      await apiRequest(`telegram-destinations/${id}`, { method: 'DELETE' })
      disconnect.value = false
      await refresh()
    })
  }

  return { destinations, loadError, refresh, status, busy, error, open, disconnect, editing, testing, search, filteredDestinations, form, edit, save, test, remove, menu }
}
