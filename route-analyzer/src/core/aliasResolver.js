import path from 'path'
import { parseFile, walk } from '../utils/ast.js'
import { exists, readJson, readText, toPosixPath } from '../utils/fs.js'
import { resolveFirstExistingFile } from '../utils/path.js'

function readJsonIfExists(filePath) {
  return exists(filePath) ? readJson(filePath) : null
}

function loadTsconfigChain(startDir, projectRoot, visited = new Set()) {
  const configPath = ['tsconfig.json', 'jsconfig.json']
    .map((name) => path.join(startDir, name))
    .find((candidate) => exists(candidate))

  if (!configPath || visited.has(configPath)) return []
  visited.add(configPath)

  const config = readJson(configPath)
  const parent = []

  if (config.extends) {
    const extendsPath = config.extends.endsWith('.json') ? config.extends : `${config.extends}.json`
    const resolvedExtends = extendsPath.startsWith('.')
      ? path.resolve(path.dirname(configPath), extendsPath)
      : path.resolve(projectRoot, extendsPath)
    if (exists(resolvedExtends)) {
      parent.push(...loadTsconfigChain(path.dirname(resolvedExtends), projectRoot, visited))
    }
  }

  parent.push({
    filePath: configPath,
    baseUrl: config.compilerOptions?.baseUrl || '.',
    paths: config.compilerOptions?.paths || {},
  })

  return parent
}

function loadWebpackAliases(projectRoot, appRoot) {
  const configPath = ['webpack.config.js', 'webpack.config.cjs', 'webpack.config.mjs']
    .map((name) => path.join(appRoot, name))
    .find((candidate) => exists(candidate))

  if (!configPath) return { aliases: {}, modules: [] }

  const code = readText(configPath)
  const aliases = {}
  const modules = []

  const aliasBlockMatch = code.match(/alias\s*:\s*\{([\s\S]*?)\}/)
  if (aliasBlockMatch) {
    const entryRegex = /['"]([^'"]+)['"]\s*:\s*path\.resolve\(__dirname,\s*['"]([^'"]+)['"]\)/g
    let match = entryRegex.exec(aliasBlockMatch[1])
    while (match) {
      aliases[match[1]] = path.resolve(appRoot, match[2])
      match = entryRegex.exec(aliasBlockMatch[1])
    }
  }

  const modulesMatch = code.match(/modules\s*:\s*\[([\s\S]*?)\]/)
  if (modulesMatch) {
    const moduleRegex = /['"]([^'"]+)['"]/g
    let match = moduleRegex.exec(modulesMatch[1])
    while (match) {
      const value = match[1]
      if (value !== 'node_modules') modules.push(path.resolve(appRoot, value))
      match = moduleRegex.exec(modulesMatch[1])
    }
  }

  return { aliases, modules }
}

function buildWorkspacePackageMap(projectRoot, manifest) {
  const map = new Map()
  for (const pkg of manifest.packageIndex || []) {
    map.set(pkg.name, {
      root: path.resolve(projectRoot, pkg.root),
      packageJson: readJsonIfExists(path.resolve(projectRoot, pkg.root, 'package.json')),
    })
  }

  return map
}

function resolveWorkspacePackageTarget(packageEntry) {
  if (!packageEntry) return null
  const pkg = packageEntry.packageJson || {}
  const candidates = [
    pkg.module,
    pkg.main,
    'src/index.tsx',
    'src/index.ts',
    'src/index.jsx',
    'src/index.js',
    'src',
  ].filter(Boolean)

  for (const candidate of candidates) {
    const resolved = resolveFirstExistingFile(path.resolve(packageEntry.root, candidate))
    if (resolved) return resolved
  }

  return null
}

function normalizeAliasMap(aliases, baseDir) {
  const normalized = []
  for (const [alias, target] of Object.entries(aliases || {})) {
    const aliasPrefix = alias.endsWith('/*') ? alias.slice(0, -2) : alias
    const targetPrefix = target.endsWith('/*') ? target.slice(0, -2) : target
    normalized.push({
      alias,
      aliasPrefix,
      target: path.resolve(baseDir, targetPrefix),
      wildcard: alias.endsWith('/*'),
    })
  }
  return normalized
}

export class AliasResolver {
  constructor({ projectRoot, app, manifest, config }) {
    this.projectRoot = projectRoot
    this.app = app
    this.appRoot = path.resolve(projectRoot, app.root)
    this.workspacePackages = buildWorkspacePackageMap(projectRoot, manifest)
    this.unresolvedImports = new Set()
    this.tsconfigChain = loadTsconfigChain(this.appRoot, projectRoot)
    this.webpackConfig = loadWebpackAliases(projectRoot, this.appRoot)
    this.manualAliases = normalizeAliasMap(
      { ...(config.aliases || {}), ...(app.aliases || {}) },
      this.appRoot,
    )
  }

  shouldTrack(importPath) {
    if (!importPath) return false
    if (importPath.startsWith('.')) return true
    if (this.workspacePackages.has(importPath)) return true
    if (this.manualAliases.some((entry) => importPath === entry.aliasPrefix || importPath.startsWith(`${entry.aliasPrefix}/`))) {
      return true
    }
    if (this.tsconfigChain.some((configEntry) => Object.keys(configEntry.paths || {}).some((key) => {
      const prefix = key.endsWith('/*') ? key.slice(0, -2) : key
      return importPath === prefix || importPath.startsWith(`${prefix}/`)
    }))) {
      return true
    }
    if (Object.keys(this.webpackConfig.aliases).some((alias) => importPath === alias || importPath.startsWith(`${alias}/`))) {
      return true
    }
    return false
  }

  noteUnresolved(importPath) {
    if (this.shouldTrack(importPath)) this.unresolvedImports.add(importPath)
  }

  resolveAliasEntries(importPath, entries) {
    for (const entry of entries) {
      const matches = entry.wildcard
        ? importPath === entry.aliasPrefix || importPath.startsWith(`${entry.aliasPrefix}/`)
        : importPath === entry.aliasPrefix
      if (!matches) continue
      const suffix = importPath.slice(entry.aliasPrefix.length).replace(/^\//, '')
      const resolved = resolveFirstExistingFile(path.resolve(entry.target, suffix))
      if (resolved) return resolved
    }
    return null
  }

  resolveTsconfig(importPath) {
    for (const configEntry of this.tsconfigChain) {
      const aliases = normalizeAliasMap(configEntry.paths, path.resolve(path.dirname(configEntry.filePath), configEntry.baseUrl))
      const resolved = this.resolveAliasEntries(importPath, aliases)
      if (resolved) return resolved
    }
    return null
  }

  resolveWebpack(importPath) {
    const aliasEntries = normalizeAliasMap(this.webpackConfig.aliases, this.appRoot)
    const aliasResolved = this.resolveAliasEntries(importPath, aliasEntries)
    if (aliasResolved) return aliasResolved

    for (const moduleDir of this.webpackConfig.modules) {
      const resolved = resolveFirstExistingFile(path.resolve(moduleDir, importPath))
      if (resolved) return resolved
    }

    return null
  }

  resolveWorkspacePackage(importPath) {
    if (this.workspacePackages.has(importPath)) {
      return resolveWorkspacePackageTarget(this.workspacePackages.get(importPath))
    }

    const packageNames = [...this.workspacePackages.keys()]
      .filter((name) => importPath.startsWith(`${name}/`))
      .sort((a, b) => b.length - a.length)

    for (const packageName of packageNames) {
      const packageEntry = this.workspacePackages.get(packageName)
      const subPath = importPath.slice(packageName.length + 1)
      const resolved = resolveFirstExistingFile(path.resolve(packageEntry.root, subPath))
      if (resolved) return resolved
    }

    return null
  }

  resolve(importPath, fromFile) {
    if (!importPath) return null

    if (importPath.startsWith('.')) {
      const resolved = resolveFirstExistingFile(path.resolve(path.dirname(fromFile), importPath))
      if (!resolved) this.noteUnresolved(importPath)
      return resolved
    }

    const manualResolved = this.resolveAliasEntries(importPath, this.manualAliases)
    if (manualResolved) return manualResolved

    const tsResolved = this.resolveTsconfig(importPath)
    if (tsResolved) return tsResolved

    const webpackResolved = this.resolveWebpack(importPath)
    if (webpackResolved) return webpackResolved

    const workspaceResolved = this.resolveWorkspacePackage(importPath)
    if (workspaceResolved) return workspaceResolved

    this.noteUnresolved(importPath)
    return null
  }

  resolveFromAppRoot(importPath) {
    if (!importPath) return null
    if (importPath.startsWith('.')) {
      const resolved = resolveFirstExistingFile(path.resolve(this.appRoot, importPath))
      if (!resolved) this.noteUnresolved(importPath)
      return resolved
    }

    return this.resolve(importPath, path.join(this.appRoot, 'index.js'))
  }

  getUnresolvedImports() {
    return [...this.unresolvedImports].sort()
  }

  toProjectRelative(absolutePath) {
    if (!absolutePath) return ''
    return toPosixPath(path.relative(this.projectRoot, absolutePath))
  }
}
