export function useDashboardKiosk() {
  const router = useRouter()
  const route = useRoute()
  const kiosk = computed(() => route.path.startsWith('/dashboards/') && !!route.params.id && route.params.id !== 'new' && route.query.kiosk === '1')

  function enterKiosk() {
    return router.replace({ path: route.path, query: { ...route.query, kiosk: '1' } })
  }

  function exitKiosk() {
    const query = { ...route.query }
    Reflect.deleteProperty(query, 'kiosk')
    return router.replace({ path: route.path, query })
  }

  return { kiosk, enterKiosk, exitKiosk }
}
