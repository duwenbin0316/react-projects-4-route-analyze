import path from 'path'
import fs from 'fs'

export function normalizeRoutePath(routePath) {
  if (!routePath) return '/'
  let normalized = routePath.replace(/\\/g, '/')
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  normalized = normalized.replace(/\/+/g, '/')
  if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1)
  return normalized
}

export function joinRoutePath(parentPath, childPath, isIndex = false) {
  if (!parentPath && !childPath) return '/'
  if (isIndex) return normalizeRoutePath(parentPath || '/')
  if (!childPath) return normalizeRoutePath(parentPath || '/')
  if (childPath.startsWith('/')) return normalizeRoutePath(childPath)
  return normalizeRoutePath(`${parentPath || ''}/${childPath}`)
}

export function resolveImportFile(fromFile, importSource) {
  if (!importSource || !importSource.startsWith('.')) return null
  const basePath = path.resolve(path.dirname(fromFile), importSource)
  return buildFileCandidates(basePath)
}

export function buildFileCandidates(basePath) {
  return [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]
}

export function resolveFirstExistingFile(basePath) {
  const candidates = buildFileCandidates(basePath)
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

export function stripQueryAndHash(input) {
  return input.split('#')[0].split('?')[0]
}

export function parseQueryString(searchValue) {
  if (!searchValue) return undefined
  const normalized = searchValue.startsWith('?') ? searchValue.slice(1) : searchValue
  const params = Object.fromEntries(new URLSearchParams(normalized).entries())
  return Object.keys(params).length ? params : undefined
}

export function routePatternToRegex(pattern) {
  const escaped = normalizeRoutePath(pattern)
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/:(\w+)/g, '[^/]+')
  return new RegExp(`^${escaped}$`)
}

export function matchRoutePattern(candidate, targetPattern) {
  if (!candidate || !targetPattern) return false
  return routePatternToRegex(targetPattern).test(normalizeRoutePath(candidate))
}
