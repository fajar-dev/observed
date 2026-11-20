import type { MaybeRefOrGetter } from 'vue'
import { product, productPageTitle } from '#shared/config/product'

/** Keep browser titles and social previews aligned as pages and dashboard names change. */
export function usePageSeo(title: MaybeRefOrGetter<string>, description: MaybeRefOrGetter<string> = product.description) {
  const pageTitle = computed(() => productPageTitle(toValue(title)))
  const pageDescription = computed(() => toValue(description))
  useSeoMeta({
    title: pageTitle,
    description: pageDescription,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    twitterTitle: pageTitle,
    twitterDescription: pageDescription
  })
}
