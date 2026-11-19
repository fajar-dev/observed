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
  if (to.path === '/dashboards/new' && !auth.canWrite.value) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Editor access required' }))
  }
})
