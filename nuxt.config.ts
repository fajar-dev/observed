import { product } from './shared/config/product'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],
  ssr: false,

  components: [{ path: '~/components', pathPrefix: false }, { path: '~/features', pattern: '**/*.vue', pathPrefix: false }],
  imports: { dirs: ['core/composables', 'core/utils', 'features/**/composables'] },

  devtools: {
    enabled: false
  },
  app: {
    head: {
      title: product.title,
      htmlAttrs: { lang: product.language },
      meta: [
        { name: 'description', content: product.description },
        { name: 'application-name', content: product.name },
        { name: 'apple-mobile-web-app-title', content: product.name },
        { name: 'theme-color', content: product.themeColor },
        { name: 'robots', content: 'noindex, nofollow' },
        { property: 'og:site_name', content: product.name },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: product.title },
        { property: 'og:description', content: product.description },
        { property: 'og:locale', content: product.locale },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: product.title },
        { name: 'twitter:description', content: product.description }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/icons/icon_192x192.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'bun'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
