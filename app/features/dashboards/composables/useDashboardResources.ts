import type { Dashboard, Folder } from '#shared/domain/dashboard'

export const useDashboards = () => useResourceCollection<Dashboard>('dashboards')
export const useDashboardFolders = () => useResourceCollection<Folder>('dashboard-folders')
