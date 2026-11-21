import type { AuthProvider, AuthSession, AuthUser } from '#shared/domain/auth'

export function useProfile() {
  const router = useRouter()
  const apiRequest = useApiRequest()
  const auth = useAuthentication()
  const route = useRoute()
  const { data: configuration, error: configurationError } = useAsyncData('auth-config', auth.configuration, { server: false })
  const { data: linked, error: linkedError } = useAsyncData<AuthProvider[]>('auth-linked', () => apiRequest<AuthProvider[]>('auth/providers'), { server: false, default: () => [] })
  const { data: sessions, error: sessionsError, refresh } = useAsyncData('auth-sessions', () => apiRequest<AuthSession[]>('auth/sessions'), { server: false, default: () => [] })
  const { busy, error, perform } = useAsyncAction()
  const toast = useNotifications()
  const form = reactive({ name: auth.user.value?.name || '', currentPassword: '', password: '' })
  const state = computed(() => ({ name: form.name, currentPassword: form.currentPassword || undefined, password: form.password || undefined }))
  async function save() {
    await perform(async () => {
      const user = await apiRequest<AuthUser>('auth/profile', { method: 'PUT', body: state.value })
      if (form.password) {
        auth.user.value = null
        clearNuxtData()
        await router.push('/sign-in')
        return
      }
      auth.user.value = user
      toast.add({ title: 'Profile saved', description: 'Your account details have been updated.', color: 'success' })
    })
  }
  async function revoke(session: AuthSession) {
    await perform(async () => {
      await apiRequest('auth/sessions', { method: 'DELETE', body: { id: session.id } })
      if (session.current) {
        auth.user.value = null
        clearNuxtData()
        await router.push('/sign-in')
      } else await refresh()
    })
  }

  const loadError = computed(() => configurationError.value || linkedError.value || sessionsError.value)
  return { auth, route, configuration, linked, sessions, busy, error, loadError, form, state, save, revoke }
}
