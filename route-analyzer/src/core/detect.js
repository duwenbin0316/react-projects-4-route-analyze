import path from 'path'
import { expandWorkspacePatterns, loadWorkspacePatterns } from './config.js'
import { exists, readJson, toPosixPath } from '../utils/fs.js'

function getRouterVersion(packageJson) {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const reactRouterDom = deps['react-router-dom']
  const reactRouter = deps['react-router']

  if (reactRouterDom?.includes('5') || reactRouter?.includes('5')) return 'v5'
  if (reactRouter?.includes('3')) return 'v3'
  return 'unknown'
}

function hasRouterDependency(packageJson) {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  return Boolean(deps['react-router'] || deps['react-router-dom'])
}

function findRouteEntries(appRoot) {
  const candidates = [
    'src/router/index.tsx',
    'src/router/index.jsx',
    'src/router/index.ts',
    'src/router/index.js',
    'src/routes.tsx',
    'src/routes.jsx',
    'src/routes.ts',
    'src/routes.js',
    'src/App.tsx',
    'src/App.jsx',
    'src/App.ts',
    'src/App.js',
  ]

  return candidates.filter((candidate) => exists(path.join(appRoot, candidate)))
}

function buildAppEntry(projectRoot, appRoot) {
  const packageJsonPath = path.join(appRoot, 'package.json')
  if (!exists(packageJsonPath)) return null
  const packageJson = readJson(packageJsonPath)
  if (!hasRouterDependency(packageJson)) return null

  return {
    name: packageJson.name || path.basename(appRoot),
    root: toPosixPath(path.relative(projectRoot, appRoot)) || '.',
    routeEntries: findRouteEntries(appRoot),
    routerVersion: getRouterVersion(packageJson),
    role: 'standalone',
    customNavigators: [],
    mounts: {},
    packageJson,
  }
}

function applyRoles(apps) {
  const appNames = new Set(apps.map((app) => app.name))
  const dependencyGraph = new Map(apps.map((app) => [app.name, []]))

  for (const app of apps) {
    const deps = { ...app.packageJson.dependencies, ...app.packageJson.devDependencies }
    const workspaceDeps = Object.keys(deps).filter((name) => appNames.has(name))
    dependencyGraph.set(app.name, workspaceDeps)
  }

  for (const app of apps) {
    const deps = dependencyGraph.get(app.name) || []
    if (deps.length) app.role = 'host'
  }

  for (const app of apps) {
    const referencedByOther = apps.some((candidate) =>
      (dependencyGraph.get(candidate.name) || []).includes(app.name),
    )
    if (referencedByOther && app.role !== 'host') app.role = 'sub-app'
  }
}

function detectSharedLibs(projectRoot, workspaceDirs) {
  const packages = workspaceDirs
    .map((dir) => {
      const packageJsonPath = path.join(dir, 'package.json')
      if (!exists(packageJsonPath)) return null
      const packageJson = readJson(packageJsonPath)
      return { dir, packageJson }
    })
    .filter(Boolean)

  const packageNames = new Set(packages.map((item) => item.packageJson.name))
  const referenceCount = new Map()

  for (const item of packages) {
    const deps = { ...item.packageJson.dependencies, ...item.packageJson.devDependencies }
    for (const depName of Object.keys(deps)) {
      if (!packageNames.has(depName)) continue
      referenceCount.set(depName, (referenceCount.get(depName) || 0) + 1)
    }
  }

  return packages
    .filter((item) => !hasRouterDependency(item.packageJson) && (referenceCount.get(item.packageJson.name) || 0) > 1)
    .map((item) => item.packageJson.name)
}

function mergeConfigApps(projectRoot, detectedApps, configApps = []) {
  if (!configApps.length) return detectedApps
  const detectedByRoot = new Map(detectedApps.map((app) => [app.root, app]))

  return configApps.map((configApp) => {
    const detected = detectedByRoot.get(configApp.root) || {}
    return {
      ...detected,
      ...configApp,
      root: configApp.root,
      routeEntries: configApp.routeEntries || detected.routeEntries || [],
      customNavigators: configApp.customNavigators || detected.customNavigators || [],
      mounts: configApp.mounts || detected.mounts || {},
      role: configApp.role || detected.role || 'standalone',
    }
  })
}

export function detectProject(projectRoot, config = {}) {
  const workspacePatterns = loadWorkspacePatterns(projectRoot)
  const isMonorepo = Boolean(workspacePatterns?.length)
  const workspaceDirs = isMonorepo ? expandWorkspacePatterns(projectRoot, workspacePatterns) : [projectRoot]

  const detectedApps = workspaceDirs
    .map((dir) => buildAppEntry(projectRoot, dir))
    .filter(Boolean)

  applyRoles(detectedApps)

  const apps = mergeConfigApps(projectRoot, detectedApps, config.apps)
  const sharedLibs = isMonorepo ? detectSharedLibs(projectRoot, workspaceDirs) : []
  const packageIndex = workspaceDirs
    .map((dir) => {
      const packageJsonPath = path.join(dir, 'package.json')
      if (!exists(packageJsonPath)) return null
      const packageJson = readJson(packageJsonPath)
      return {
        name: packageJson.name || path.basename(dir),
        root: toPosixPath(path.relative(projectRoot, dir)) || '.',
      }
    })
    .filter(Boolean)

  return {
    workspace: projectRoot,
    apps: apps.map((app) => ({
      name: app.name,
      root: app.root,
      routeEntries: app.routeEntries,
      routerVersion: app.routerVersion,
      role: app.role,
      mounts: app.mounts || {},
      customNavigators: app.customNavigators || [],
      aliases: app.aliases || config.aliases || {},
    })),
    sharedLibs,
    packageIndex,
  }
}
