export function useDashboardKiosk() {
  const route = useRoute()
  const kiosk = computed(() => route.path.startsWith('/dashboards/') && !!route.params.id && route.params.id !== 'new' && route.query.kiosk === '1')

  function enterKiosk() {
    return navigateTo({ path: route.path, query: { ...route.query, kiosk: '1' } }, { replace: true })
  }

  function exitKiosk() {
    const query = { ...route.query }
    Reflect.deleteProperty(query, 'kiosk')
    return navigateTo({ path: route.path, query }, { replace: true })
  }

  return { kiosk, enterKiosk, exitKiosk }
}
