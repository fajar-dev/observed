import type { AuthUser, AuthConfiguration } from '#shared/domain/auth'
import { canEdit } from '#shared/domain/auth'

export function useAuthentication() {
  const router = useRouter()
  const apiRequest = useApiRequest()
  const api = useNuxtApp().$workspaceApi
  const user = useState<AuthUser | null>('auth-user', () => null)
  const initialized = useState('auth-initialized', () => false)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const canWrite = computed(() => canEdit(user.value?.role))
  async function initialize() {
    if (initialized.value) return
    try {
      const session = await apiRequest<{ user: AuthUser | null, canRefresh: boolean }>('auth/session')
      if (!session.user && session.canRefresh) {
        await api.renewSession()
        user.value = (await apiRequest<{ user: AuthUser | null }>('auth/session')).user
      } else user.value = session.user
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 401) throw error
      user.value = null
    }
    initialized.value = true
  }
  async function signIn(input: { email: string, password: string }) {
    const response = await apiRequest<{ user: AuthUser }>('auth/sign-in', { method: 'POST', body: input })
    clearNuxtData()
    user.value = response.user
    initialized.value = true
  }
  async function setup(input: { email: string, name: string, password: string }) {
    const response = await apiRequest<{ user: AuthUser }>('auth/setup', { method: 'POST', body: input })
    clearNuxtData()
    user.value = response.user
    initialized.value = true
  }
  async function signOut() {
    await apiRequest('auth/sign-out', { method: 'POST' })
    user.value = null
    initialized.value = true
    clearNuxtData()
    await router.push('/sign-in')
  }
  const configuration = () => apiRequest<AuthConfiguration>('auth/config')
  return { user, initialized, isAdmin, canWrite, initialize, signIn, setup, signOut, configuration }
}
