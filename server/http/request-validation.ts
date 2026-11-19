import { z } from 'zod'
import type { H3Event } from 'h3'

export async function validateBody<T>(event: Parameters<typeof readBody>[0], schema: z.ZodType<T>) {
  const limit = 2 * 1024 * 1024
  const request = getRequestWebStream(event)
  if (Number(getHeader(event, 'content-length')) > limit) throw createError({ statusCode: 413 })
  const reader = request?.getReader()
  const decoder = new TextDecoder()
  let body = ''
  let bytes = 0
  try {
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > limit) throw createError({ statusCode: 413 })
      body += decoder.decode(value, { stream: true })
    }
    body += decoder.decode()
  } finally {
    await reader?.cancel().catch(() => {})
  }
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Expected a JSON body' })
  }
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid input',
      data: { message: parsed.error.issues.map(issue => [issue.path.join('.'), issue.message].filter(Boolean).join(' · ')).join('\n') }
    })
  }
  return parsed.data
}

export function resourceId(event: H3Event) {
  const parsed = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid resource identifier' })
  return parsed.data
}
