import type { BreadcrumbItem } from '@nuxt/ui'

export function useAppBreadcrumb() {
  const route = useRoute()

  return computed<BreadcrumbItem[]>(() => {
    const breadcrumb = route.meta.breadcrumb

    return [
      { label: typeof breadcrumb === 'string' ? breadcrumb : 'Overview', active: true }
    ]
  })
}
