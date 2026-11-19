import type { QueryRequest } from '#shared/domain/query'
import type { DataSourceInput } from '#shared/domain/data-source'
import type { VariableValues } from '#shared/domain/variable'
import { fluxString, ranges } from '#shared/domain/query'

export function queryWindow(input: Pick<QueryRequest, 'range' | 'from' | 'to'>, now = Date.now()) {
  if (Boolean(input.from) !== Boolean(input.to)) throw new Error('Select both a start and end time.')
  const stop = input.to ? Date.parse(input.to) : now
  const start = input.from ? Date.parse(input.from) : stop - ranges.find(range => range.value === input.range)!.seconds * 1000
  if (!Number.isFinite(start) || !Number.isFinite(stop) || start >= stop) throw new Error('The start time must be before the end time.')
  if (stop - start > 366 * 86400_000) throw new Error('Choose a time range within 366 days.')
  return { start: new Date(start).toISOString(), stop: new Date(stop).toISOString(), interval: `${Math.max(1, Math.ceil((stop - start) / 300000))}s` }
}

const variableToken = /\$\{([A-Za-z][A-Za-z0-9_]*)(?::([^}]+))?\}|\$([A-Za-z][A-Za-z0-9_]*)/g

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replaceAll('\n', '\\n').replaceAll('\r', '\\r')
}

function regexValues(values: string[]) {
  const escaped = values.map(escapeRegex)
  return escaped.length > 1 ? '(' + escaped.join('|') + ')' : escaped[0] ?? '(?!)'
}

export function interpolateVariables(query: string, variables: QueryRequest['variables'], queryLanguage: DataSourceInput['queryLanguage']) {
  const known: VariableValues = variables ?? {}
  const valuesFor = (name: string) => {
    if (name.startsWith('__') || (queryLanguage === 'influxql' && name === 'timeFilter')) return undefined
    const value = Object.hasOwn(known, name) ? known[name] : undefined
    if (value === undefined) throw new Error(`Variable "${name}" is not resolved. Configure it in dashboard settings.`)
    const selected = Array.isArray(value) ? value : [value]
    if (!selected.length) throw new Error(`Select at least one value for variable "${name}".`)
    return selected
  }
  const literal = (value: string) => queryLanguage === 'flux' ? fluxString(value) : '\'' + value.replace(/[\\']/g, '\\$&') + '\''

  // Equality selectors must retain membership semantics when a variable selects several values.
  const statement = query.replace(
    /(r(?:\.[A-Za-z_]\w*|\["(?:\\.|[^"\\])*"\]))\s*(==|!=)\s*(["'])(\$\{[A-Za-z][A-Za-z0-9_]*(?::[^}]+)?\}|\$[A-Za-z][A-Za-z0-9_]*)\3/g,
    (match, field: string, operator: string, _quote: string, token: string) => {
      if (queryLanguage !== 'flux') return match
      const name = /^\$\{([^}:]+)/.exec(token)?.[1] ?? token.slice(1)
      const values = valuesFor(name)
      if (!values || values.length <= 1) return match
      const expression = `contains(value: ${field}, set: [${values.map(fluxString).join(', ')}])`
      return operator === '!=' ? 'not ' + expression : expression
    }
  )

  function replaceTokens(content: string, context: 'string' | 'regex' | 'code', quote = '"') {
    return content.replace(variableToken, (token: string, first: string, format: string, second: string) => {
      const name = first || second
      const values = valuesFor(name)
      if (!values) return token
      const value = format === 'regex' || context === 'regex' ? regexValues(values) : values.join(format === 'pipe' ? '|' : ',')
      if (context === 'regex') return value
      if (context === 'string') {
        if (queryLanguage === 'flux') return JSON.stringify(value).slice(1, -1).replaceAll('$' + '{', '\\' + '$' + '{')
        return value.replace(/\\/g, '\\\\').replaceAll(quote, '\\' + quote)
      }
      if (format === 'json') return JSON.stringify(values.length === 1 ? values[0] : values)
      if (format === 'raw' && values.length === 1 && /^(?:-?\d+(?:\.\d+)?(?:ns|us|ms|s|m|h|d|w)?|true|false)$/.test(value)) return value
      return literal(value)
    })
  }

  let output = ''
  let offset = 0
  let code = ''
  while (offset < statement.length) {
    const character = statement[offset]!
    if (statement.startsWith('//', offset)) {
      output += replaceTokens(code, 'code')
      code = ''
      const end = statement.indexOf('\n', offset)
      if (end < 0) return output + statement.slice(offset)
      output += statement.slice(offset, end + 1)
      offset = end + 1
      continue
    }
    const regex = character === '/' && /(?:=~|!~)\s*$/.test(code)
    if (character === '"' || character === '\'' || regex) {
      output += replaceTokens(code, 'code')
      code = ''
      const delimiter = character
      let end = offset + 1
      while (end < statement.length) {
        if (statement[end] === '\\') {
          end += 2
          continue
        }
        if (statement[end] === delimiter) break
        end++
      }
      if (end >= statement.length) {
        output += statement.slice(offset)
        offset = statement.length
        continue
      }
      output += delimiter + replaceTokens(statement.slice(offset + 1, end), regex ? 'regex' : 'string', delimiter) + delimiter
      offset = end + 1
      continue
    }
    code += character
    offset++
  }
  output += replaceTokens(code, 'code')
  return output
}

export function grafanaTimeMacros(query: string, window: ReturnType<typeof queryWindow>) {
  const milliseconds = Date.parse(window.stop) - Date.parse(window.start)
  const macros: Record<string, string> = {
    __interval: window.interval,
    __interval_ms: String(Number.parseInt(window.interval) * 1000),
    __from: String(Date.parse(window.start)),
    __to: String(Date.parse(window.stop)),
    __range_s: String(Math.ceil(milliseconds / 1000)),
    __range_ms: String(milliseconds),
    __range: Math.ceil(milliseconds / 1000) + 's'
  }
  return query.replace(/\$\{(__from|__to):date:iso\}/g, (_match, name: string) => name === '__from' ? window.start : window.stop)
    .replace(/\$\{(__[A-Za-z0-9_]+)\}|\$(__[A-Za-z0-9_]+)\b/g, (match: string, first: string, second: string) => macros[first || second] ?? match)
}
