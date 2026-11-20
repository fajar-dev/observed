import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dashboardSchema } from '../../shared/domain/dashboard.ts'
import { querySchema } from '../../shared/domain/query.ts'
import { alertRuleSchema } from '../../shared/domain/alert-rule.ts'
import { userPermissionsSchema } from '../../shared/domain/permissions.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const issues = []
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : [path.join(directory, entry.name)])
}
const markdown = [path.join(root, 'README.md'), path.join(root, 'AGENTS.md'), ...filesIn(path.join(root, 'docs')).filter(file => file.endsWith('.md'))]
for (const file of markdown) {
  const content = fs.readFileSync(file, 'utf8').replace(/```[^\n]*\n[\s\S]*?```/g, '')
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '')
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue
    const local = decodeURIComponent(target.split('#')[0])
    const resolved = path.resolve(path.dirname(file), local)
    if (!fs.existsSync(resolved)) issues.push(`${path.relative(root, file)}: missing link ${target}`)
  }
}
const examples = { 'dashboard': dashboardSchema, 'query': querySchema, 'alert-rule': alertRuleSchema, 'permissions': userPermissionsSchema }
for (const [name, schema] of Object.entries(examples)) {
  const result = schema.safeParse(JSON.parse(fs.readFileSync(path.join(root, 'docs/examples', name + '.json'), 'utf8')))
  if (!result.success) issues.push(`Example ${name}: ${result.error.message}`)
}
const routes = filesIn(path.join(root, 'server/api')).filter(file => /\.[a-z]+\.ts$/.test(file)).map((file) => {
  const [base, method] = path.relative(path.join(root, 'server/api'), file).replace(/\.ts$/, '').split(/\.([a-z]+)$/)
  const segments = base.split(path.sep)
  if (segments.at(-1) === 'index') segments.pop()
  return `${method.toUpperCase()} /api/${segments.map(segment => segment.replace(/^\[(.+)\]$/, ':$1')).join('/')}`
})
const catalog = fs.readFileSync(path.join(root, 'docs/reference/api.md'), 'utf8')
const documented = [...catalog.matchAll(/\| `(GET|POST|PUT|DELETE|PATCH) (\/api\/[^`]+)` \|/g)].map(match => match[1] + ' ' + match[2])
for (const route of routes) if (!documented.includes(route)) issues.push('Undocumented endpoint: ' + route)
for (const route of documented) if (!routes.includes(route)) issues.push('Unknown documented endpoint: ' + route)
if (new Set(documented).size !== documented.length) issues.push('Duplicate API catalog endpoint')
const environment = fs.readFileSync(path.join(root, 'docs/configuration/environment.md'), 'utf8')
for (const template of ['.env.example', 'docker/.env.example']) {
  for (const [, key] of fs.readFileSync(path.join(root, template), 'utf8').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) {
    if (!environment.includes('`' + key + '`')) issues.push(`Undocumented template variable: ${key}`)
  }
}
if (issues.length) {
  console.error(issues.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Documentation valid: ${markdown.length} Markdown files, ${Object.keys(examples).length} schema examples, ${routes.length} endpoints, environment templates and local links.`)
}
