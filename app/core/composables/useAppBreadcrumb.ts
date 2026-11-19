import type { BreadcrumbItem } from '@nuxt/ui'
import type { MaybeRefOrGetter } from 'vue'

function useBreadcrumbTitles() {
  return useState<Record<string, string>>('workspace-breadcrumb-titles', () => ({}))
}

export function useBreadcrumbTitle(title: MaybeRefOrGetter<string | undefined>) {
  const path = useRoute().path
  const titles = useBreadcrumbTitles()
  watch(() => toValue(title), (value) => {
    if (value) titles.value[path] = value
  }, { immediate: true })
  onScopeDispose(() => Reflect.deleteProperty(titles.value, path))
}

export function useAppBreadcrumb() {
  const route = useRoute()
  const titles = useBreadcrumbTitles()
  const { data: dashboards } = useDashboards()
  return computed<BreadcrumbItem[]>(() => {
    if (route.path === '/dashboards') return [{ label: 'Dashboards' }]
    if (route.path.startsWith('/dashboards/') && route.params.id) {
      const title = route.params.id === 'new'
        ? titles.value[route.path] || 'New dashboard'
        : titles.value[route.path] || dashboards.value.find(dashboard => dashboard.id === route.params.id)?.name || 'Loading dashboard…'
      return [{ label: 'Dashboards', to: '/dashboards' }, { label: title }]
    }
    if (route.path === '/alerts') return [{ label: 'Alerts' }]
    if (route.path === '/users') return [{ label: 'Users' }]
    if (route.path === '/profile') return [{ label: 'Profile' }]
    if (route.path === '/configuration') return [{ label: 'Configuration' }]
    return [{ label: 'Overview' }]
  })
}
