export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadQueryCsv(results: import('#shared/domain/query').QueryResponse[], name = 'query-results') {
  const columns = [...new Set(results.flatMap(result => result.columns))]
  const quote = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"'
  const csv = [columns.map(quote).join(','), ...results.flatMap(result => result.rows.map(row =>
    columns.map((column) => {
      const value = row[column]
      return quote(typeof value === 'string' && /^[=+@-]/.test(value) ? '\'' + value : value)
    }).join(',')
  ))].join('\r\n')
  downloadFile(name + '.csv', csv, 'text/csv;charset=utf-8')
}
