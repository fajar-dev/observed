import type { NavigationMenuItem } from '@nuxt/ui'

export function useAppNavigation() {
  const { isAdmin } = useAuthentication()
  const route = useRoute()
  const { canViewDashboards, canViewAlerts } = useAccessPermissions()
  return computed<NavigationMenuItem[]>(() => [
    { label: 'Overview', icon: 'i-lucide-house', to: '/', exact: true },
    ...(canViewDashboards.value ? [{ label: 'Dashboards', icon: 'i-lucide-layout-dashboard', to: '/dashboards' }] : []),
    ...(canViewAlerts.value ? [{ label: 'Alerts', icon: 'i-lucide-bell', to: '/alerts' }] : []),
    ...(isAdmin.value
      ? [
          { label: 'Configuration', icon: 'i-lucide-settings-2', to: '/configuration' },
          { label: 'Users', icon: 'i-lucide-users', to: '/users' }
        ]
      : [])
  ].map(item => ({
    ...item,
    active: route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to + '/'))
  })))
}
