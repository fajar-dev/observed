export function useSignIn() {
  const router = useRouter()
  const auth = useAuthentication()
  const route = useRoute()
  const { data: configuration, error: loadError } = useAsyncData('auth-config', auth.configuration, { server: false })
  const { busy, error, perform } = useAsyncAction()
  const form = reactive({ email: '', password: '', name: '' })
  const settingUp = computed(() => configuration.value?.setupRequired)
  const showPassword = ref(false)
  async function submit() {
    await perform(async () => {
      if (settingUp.value) {
        try {
          await auth.setup(form)
        } catch (failure) {
          if ((failure as { statusCode?: number }).statusCode === 409) {
            configuration.value = await auth.configuration()
            form.password = ''
          }
          throw failure
        }
      } else await auth.signIn({ email: form.email, password: form.password })
      form.password = ''
      const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') && !route.query.next.startsWith('//') && !route.query.next.startsWith('/sign-in') && !route.query.next.includes('\\') ? route.query.next : '/'
      await router.push(next)
    })
  }

  return { route, configuration, loadError, busy, error, form, settingUp, showPassword, submit }
}
