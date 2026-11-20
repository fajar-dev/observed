import type { AuthUser, UserInput } from '#shared/domain/auth'

export function useUsers() {
  const apiRequest = useApiRequest()
  const { user: current } = useAuthentication()
  const { data: users, status, error: loadError, refresh } = useAsyncData('observe:users', () => apiRequest<AuthUser[]>('users'), { server: false, default: () => [] })
  const { busy, error, perform } = useAsyncAction()
  const search = ref('')
  const open = ref(false)
  const deleting = ref(false)
  const permissionsOpen = ref(false)
  const permissionsUser = ref<AuthUser>()
  const selected = ref<AuthUser>()
  const form = reactive<UserInput>({ name: '', email: '', role: 'viewer', enabled: true, password: undefined })
  const password = ref('')
  const filtered = computed(() => users.value.filter(user => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(search.value.trim().toLowerCase())))
  function edit(user?: AuthUser) {
    selected.value = user
    Object.assign(form, { name: user?.name || '', email: user?.email || '', role: user?.role || 'viewer', enabled: user?.enabled ?? true, password: undefined })
    password.value = ''
    error.value = ''
    open.value = true
  }
  watch(password, (value) => {
    form.password = value || undefined
  })
  async function save() {
    await perform(async () => {
      if (!selected.value && !password.value) throw new Error('A password is required for new users.')
      const id = selected.value?.id
      const saved = await apiRequest<AuthUser>(id ? 'users/' + id : 'users', { method: id ? 'PUT' : 'POST', body: form })
      open.value = false
      password.value = ''
      if (saved.id === current.value?.id) current.value = saved
      await refresh()
      if (!id && saved.role !== 'admin') {
        permissionsUser.value = saved
        permissionsOpen.value = true
      }
    })
  }
  function menu(user: AuthUser) {
    return [
      { label: 'Permissions', icon: 'i-lucide-shield-check', disabled: user.role === 'admin', onSelect: () => {
        permissionsUser.value = user
        permissionsOpen.value = true
      } },
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => edit(user) },
      { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, disabled: user.id === current.value?.id, onSelect: () => {
        selected.value = user
        error.value = ''
        deleting.value = true
      } }
    ]
  }
  async function remove() {
    await perform(async () => {
      await apiRequest('users/' + selected.value!.id, { method: 'DELETE' })
      deleting.value = false
      await refresh()
    })
  }

  return { permissionsOpen, permissionsUser, current, users, status, loadError, refresh, busy, error, search, open, deleting, selected, form, password, filtered, edit, save, menu, remove }
}
