import { canAccessModule, canAccessResource, canCreateResource } from '#shared/domain/permissions'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthentication()
  await auth.initialize()
  if (!auth.user.value) {
    if (to.path !== '/sign-in') return navigateTo({ path: '/sign-in', query: { next: to.fullPath } })
    return
  }
  if (to.path === '/sign-in') return navigateTo('/')
  if ((to.path === '/configuration' || to.path === '/users') && !auth.isAdmin.value) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Administrator access required' }))
  }
  if (to.path === '/alerts' && !canAccessModule(auth.user.value, 'alerts')) return abortNavigation(createError({ statusCode: 403, statusMessage: 'Alert access is not allowed' }))
  if (to.path === '/dashboards' && !canAccessModule(auth.user.value, 'dashboards')) return abortNavigation(createError({ statusCode: 403, statusMessage: 'Dashboard access is not allowed' }))
  if (to.path.startsWith('/dashboards/') && to.params.id !== 'new' && !canAccessResource(auth.user.value, 'dashboards', String(to.params.id))) return abortNavigation(createError({ statusCode: 403, statusMessage: 'Dashboard access is not allowed' }))
  if (to.path === '/dashboards/new' && !canCreateResource(auth.user.value, 'dashboards')) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Editor access required' }))
  }
})
