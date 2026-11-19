import type { NavigationMenuItem } from '@nuxt/ui'

export function useAppNavigation(): NavigationMenuItem[] {
  return [
    { label: 'Overview', icon: 'i-lucide-house', to: '/', exact: true },
    { label: 'Dashboards', icon: 'i-lucide-layout-dashboard', to: '/dashboards' },
    { label: 'Alerts', icon: 'i-lucide-bell', to: '/alerts' },
    { label: 'Configuration', icon: 'i-lucide-settings-2', to: '/configuration' }
  ]
}
