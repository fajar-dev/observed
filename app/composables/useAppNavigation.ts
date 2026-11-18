import type { NavigationMenuItem } from '@nuxt/ui'

const appNavigation = [
  { label: 'Overview', icon: 'i-lucide-house', to: '/', exact: true },
  { label: 'Playground', icon: 'i-lucide-flask-conical', to: '/playground' },
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Alert', icon: 'i-lucide-bell', to: '/alert' },
  { label: 'Report', icon: 'i-lucide-file-text', to: '/report' },
  { label: 'Users', icon: 'i-lucide-users', to: '/users' },
  { label: 'Configuration', icon: 'i-lucide-settings', to: '/configuration' }
] satisfies NavigationMenuItem[]

export function useAppNavigation() {
  return appNavigation
}
