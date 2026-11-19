import type { NavigationMenuItem } from '@nuxt/ui'

export function useAppNavigation() {
  const { isAdmin } = useAuthentication()
  return computed<NavigationMenuItem[]>(() => [
    { label: 'Overview', icon: 'i-lucide-house', to: '/', exact: true },
    { label: 'Dashboards', icon: 'i-lucide-layout-dashboard', to: '/dashboards' },
    { label: 'Alerts', icon: 'i-lucide-bell', to: '/alerts' },
    ...(isAdmin.value
      ? [
          { label: 'Configuration', icon: 'i-lucide-settings-2', to: '/configuration' },
          { label: 'Users', icon: 'i-lucide-users', to: '/users' }
        ]
      : [])
  ])
}
