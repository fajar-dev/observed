import { canAccessModule, canAccessResource, canCreateResource, canDeleteResource } from '#shared/domain/permissions'

export function useAccessPermissions() {
  const { user } = useAuthentication()
  return {
    canViewDashboards: computed(() => canAccessModule(user.value, 'dashboards')),
    canViewAlerts: computed(() => canAccessModule(user.value, 'alerts')),
    canCreateDashboard: computed(() => canCreateResource(user.value, 'dashboards')),
    canCreateAlert: computed(() => canCreateResource(user.value, 'alerts')),
    canDeleteDashboard: (resource: { id: string, createdBy?: string }) => canDeleteResource(user.value, 'dashboards', resource),
    canDeleteAlert: (resource: { id: string, createdBy?: string }) => canDeleteResource(user.value, 'alerts', resource),
    canEditDashboard: (id: string) => canAccessResource(user.value, 'dashboards', id, 'edit'),
    canEditAlert: (id: string) => canAccessResource(user.value, 'alerts', id, 'edit')
  }
}

export function useDashboardWriteAccess() {
  const route = useRoute()
  const { canCreateDashboard, canEditDashboard } = useAccessPermissions()
  return computed(() => route.params.id === 'new' ? canCreateDashboard.value : canEditDashboard(String(route.params.id)))
}
