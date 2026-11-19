import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const root = process.cwd()
const files = execFileSync('rg', ['--files', 'app', 'server', 'shared'], { encoding: 'utf8' }).trim().split('\n')
const runtimeFiles = files.filter(file => /\.(ts|vue)$/.test(file))
const source = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]))
const autoImports = new Map()
const components = new Map()
const issues = []
const graph = new Map(runtimeFiles.map(file => [file, new Set()]))

function resolveImport(from, specifier) {
  const target = specifier.startsWith('~~/')
    ? specifier.slice(3)
    : specifier.startsWith('~/')
      ? 'app/' + specifier.slice(2)
      : specifier.startsWith('#shared/')
        ? 'shared/' + specifier.slice(8)
        : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier)) : undefined
  if (!target) return undefined
  return [target, target + '.ts', target + '.vue', target + '/index.ts'].find(file => source.has(file))
}
for (const match of fs.readFileSync('.nuxt/imports.d.ts', 'utf8').matchAll(/export \{([^}]+)\} from ['"]([^'"]+)['"]/g)) {
  const resolved = resolveImport('.nuxt/imports.d.ts', match[2])
  if (resolved) for (const item of match[1].split(',')) autoImports.set(item.trim().split(/\s+as\s+/).at(-1), resolved)
}
for (const match of fs.readFileSync('.nuxt/components.d.ts', 'utf8').matchAll(/export const (\w+):[^\n]*?import\("([^"]+)"\)/g)) {
  const resolved = resolveImport('.nuxt/components.d.ts', match[2])
  if (resolved) components.set(match[1], resolved)
}

for (const file of runtimeFiles) {
  const text = source.get(file)
  const script = file.endsWith('.vue') ? [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n') : text
  const ast = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true)
  const edges = graph.get(file)
  const addImport = (specifier) => {
    const resolved = resolveImport(file, specifier)
    if (resolved) edges.add(resolved)
    if ((specifier.startsWith('~~/server/') || specifier.startsWith('~/') || specifier.startsWith('#shared/') || specifier.startsWith('.')) && !resolved && !specifier.includes('node_modules')) issues.push(file + ': unresolved import ' + specifier)
    if (file.startsWith('app/') && specifier.includes('server/')) issues.push(file + ': frontend imports backend')
    if (file.startsWith('shared/') && /(?:server|app)\//.test(specifier)) issues.push(file + ': shared contract imports an application layer')
    if (file.includes('/application/') && /\/(?:infrastructure|platform)\//.test(specifier)) issues.push(file + ': application imports an adapter')
    if (file.startsWith('server/api/') && /\/(?:infrastructure|platform)\//.test(specifier)) issues.push(file + ': HTTP controller imports an adapter')
  }
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) addImport(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) addImport(node.arguments[0].text)
    if (ts.isIdentifier(node) && autoImports.has(node.text)) edges.add(autoImports.get(node.text))
    ts.forEachChild(node, visit)
  }
  visit(ast)
  for (const match of text.matchAll(/<(\w+)\b/g)) if (components.has(match[1])) edges.add(components.get(match[1]))
  if (/<UAlert\b|<RequestError\b/.test(text)) issues.push(file + ': deprecated inline notification')
}
const entries = runtimeFiles.filter(file => /^app\/(pages|layouts|plugins|middleware)\//.test(file) || /^server\/(api|middleware|plugins)\//.test(file) || ['app/app.vue', 'app/error.vue', 'app/app.config.ts'].includes(file))
const reachable = new Set()
function visit(file) {
  if (reachable.has(file)) return
  reachable.add(file)
  for (const dependency of graph.get(file) || []) visit(dependency)
}
entries.forEach(visit)
const unreachable = runtimeFiles.filter(file => !reachable.has(file))
issues.push(...unreachable.map(file => file + ': unreachable runtime module'))
const summary = {
  runtimeModules: runtimeFiles.length,
  styleSheets: files.filter(file => file.endsWith('.css')).length,
  featureModules: [...new Set(runtimeFiles.filter(file => file.includes('/features/')).map(file => file.split('/features/')[1].split('/')[0]))].sort(),
  unresolvedOrInvalid: issues
}
if (process.argv.includes('--inventory')) {
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
  fs.writeFileSync('docs/source-inventory.json', JSON.stringify({ ...summary, files: files.map(file => ({ path: file, lines: source.get(file).split('\n').length - 1, reachable: graph.has(file) ? reachable.has(file) : null })) }, null, 2) + '\n')
}
console.log(JSON.stringify(summary, null, 2))
if (issues.length) process.exitCode = 1
