type Model = Record<string, unknown>
const model = (value: unknown): Model => value && typeof value === 'object' && !Array.isArray(value) ? value as Model : {}
const identifier = (value: string) => '"' + value.replace(/[\\"]/g, '\\$&') + '"'
const literal = (value: string) => '\'' + value.replace(/[\\']/g, '\\$&') + '\''
const text = (value: unknown) => typeof value === 'string' ? value : ''

export function grafanaQuery(target: Model): string | undefined {
  if (typeof target.query === 'string' && target.query.trim()) return target.query.trim()
  if (!text(target.measurement) || !Array.isArray(target.select)) return undefined
  const fields = target.select.flatMap((selection) => {
    if (!Array.isArray(selection)) return []
    const parts = selection.map(model)
    const field = parts.find(part => part.type === 'field')
    const column = Array.isArray(field?.params) ? text(field.params[0]) : ''
    if (!column) return []
    let expression = identifier(column)
    for (const part of parts.filter(part => part.type !== 'field')) {
      const type = text(part.type).toLowerCase()
      if (!['mean', 'min', 'max', 'sum', 'count', 'last', 'first', 'median', 'spread', 'stddev', 'derivative', 'non_negative_derivative', 'difference', 'non_negative_difference'].includes(type)) return []
      const params = Array.isArray(part.params) ? part.params.map(text).filter(Boolean) : []
      if (params.some(param => !/^\d+(?:ns|u|ms|s|m|h|d|w)?$/.test(param))) return []
      expression = `${type.toUpperCase()}(${expression}${params.length ? ', ' + params.join(', ') : ''})`
    }
    return [expression]
  })
  if (!fields.length || fields.length !== target.select.length) return undefined
  const groups = Array.isArray(target.groupBy) ? target.groupBy.map(model) : []
  const grouping: string[] = []
  for (const group of groups) {
    const value = Array.isArray(group.params) ? text(group.params[0]) : ''
    if (group.type === 'time') {
      if (!/^\d+(?:ns|u|ms|s|m|h|d|w)$/.test(value) && !['$__interval', '$interval'].includes(value)) return undefined
      grouping.push(`time(${value === '$interval' ? '$__interval' : value})`)
    } else if (group.type === 'tag') {
      if (!value) return undefined
      grouping.push(identifier(value))
    } else if (group.type !== 'fill') return undefined
  }
  let where = '$timeFilter'
  for (const tag of Array.isArray(target.tags) ? target.tags.map(model) : []) {
    const operator = text(tag.operator) || '='
    if (!['=', '!=', '<>', '=~', '!~'].includes(operator) || !text(tag.key)) return undefined
    if (tag.condition && tag.condition !== 'AND') return undefined
    const value = text(tag.value)
    const expression = ['=~', '!~'].includes(operator) ? (value.startsWith('/') && value.endsWith('/') ? value : '/' + value.replace(/\//g, '\\/') + '/') : literal(value)
    where += ` AND ${identifier(text(tag.key))} ${operator} ${expression}`
  }
  const policy = text(target.policy)
  const from = (policy && policy !== 'default' ? identifier(policy) + '.' : '') + identifier(text(target.measurement))
  return `SELECT ${fields.join(', ')} FROM ${from} WHERE ${where}` + (grouping.length ? ` GROUP BY ${grouping.join(', ')} fill(null)` : '')
}
