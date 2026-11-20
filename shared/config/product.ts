/** Public product identity. Connection settings and persisted monitoring data have independent contracts. */
export const product = {
  name: 'Observed',
  title: 'Observed · Structural Health Monitoring',
  description: 'Custom dashboards for IoT sensor data on buildings, bridges, and other structures. Built for civil engineers, contractors, and asset owners.',
  tagline: 'Understand your structures.',
  audience: 'Civil engineers, contractors, and asset owners',
  themeColor: '#2D4E6F',
  language: 'en',
  locale: 'en_US',
  logo: '/logo-full.png'
} as const

export function productPageTitle(title: string) {
  return `${title} · ${product.name}`
}
