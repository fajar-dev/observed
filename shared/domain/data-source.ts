import { z } from 'zod'
import { name } from './common'

export const languages = ['flux', 'influxql'] as const

export const dataSourceSchema = z.object({
  name,
  url: z.url({ protocol: /^https?$/ }),
  queryLanguage: z.enum(languages),
  organization: z.string().trim().max(200),
  database: name,
  username: z.string().trim().max(200).optional(),
  secret: z.string().max(4096).optional()
}).superRefine((source, ctx) => {
  if (!URL.canParse(source.url)) return
  const url = new URL(source.url)
  if (url.username || url.password || url.search || url.hash) {
    ctx.addIssue({ code: 'custom', path: ['url'], message: 'Enter a base URL without credentials, parameters, or fragments.' })
  }
  if (source.queryLanguage === 'flux' && !source.organization) {
    ctx.addIssue({ code: 'custom', path: ['organization'], message: 'Organization is required for Flux.' })
  }
})

export type DataSourceInput = z.infer<typeof dataSourceSchema>

export type DataSource = Omit<DataSourceInput, 'secret'> & { id: string, hasSecret: boolean }
