import { WorkspaceError } from '~~/server/domain/workspace-error'

/** Inspect executable tokens, leaving quoted identifiers, strings and regex values intact. */
export function assertReadOnlyInfluxQl(query: string) {
  let code = ''
  for (let index = 0; index < query.length;) {
    const next = query[index]!
    if (query.startsWith('--', index) || query.startsWith('//', index)) {
      const end = query.indexOf('\n', index)
      index = end < 0 ? query.length : end + 1
      code += ' '
      continue
    }
    if (query.startsWith('/*', index)) {
      const end = query.indexOf('*/', index + 2)
      if (end < 0) throw invalid()
      index = end + 2
      code += ' '
      continue
    }
    if (next === '"' || next === '\'' || (next === '/' && /(?:=~|!~)\s*$/.test(code))) {
      const quote = next
      index++
      let closed = false
      while (index < query.length) {
        if (query[index] === '\\') {
          index += 2
          continue
        }
        if (query[index++] === quote) {
          closed = true
          break
        }
      }
      if (!closed) throw invalid()
      code += ' value '
      continue
    }
    code += next
    index++
  }
  const statement = code.trim()
  if (!/^(SELECT|SHOW)\b/i.test(statement) || /\bINTO\b/i.test(statement) || statement.includes(';')) throw invalid()
}
function invalid() {
  return new WorkspaceError({ statusCode: 422, statusMessage: 'Use one read-only SELECT or SHOW statement without INTO or statement separators' })
}
