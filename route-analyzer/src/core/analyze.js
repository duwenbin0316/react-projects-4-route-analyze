import path from 'path'
import { detectProject } from './detect.js'
import { loadAnalyzerConfig } from './config.js'
import { extractRoutesFromFile } from './routeExtractor.js'
import { extractNavigationEdges } from './navigationExtractor.js'

function collectRoutes(projectRoot, manifest) {
  return manifest.apps.flatMap((app) =>
    app.routeEntries.flatMap((routeEntry) =>
      extractRoutesFromFile(projectRoot, path.resolve(projectRoot, app.root, routeEntry), app.name),
    ),
  )
}

function applyMounts(routes, manifest) {
  const mountEntries = manifest.apps
    .filter((app) => app.mounts && Object.keys(app.mounts).length)
    .flatMap((app) => Object.entries(app.mounts).map(([mountPath, appName]) => ({ mountPath, appName })))

  if (!mountEntries.length) return routes

  return routes.map((route) => {
    const mountEntry = mountEntries.find((entry) => entry.appName === route.app)
    if (!mountEntry) return route
    return {
      ...route,
      path: route.path === '/' ? mountEntry.mountPath : `${mountEntry.mountPath}${route.path}`,
    }
  })
}

function buildStats(routes, edges) {
  const unresolvedEdges = edges.filter(
    (edge) =>
      edge.confidence === 'low' ||
      !edge.to.path ||
      edge.to.rawExpression ||
      JSON.stringify(edge.params).includes('"unresolved"'),
  )

  return {
    totalRoutes: routes.length,
    totalEdges: edges.length,
    resolvedEdges: edges.length - unresolvedEdges.length,
    unresolvedEdges: unresolvedEdges.length,
    llmResolvedEdges: 0,
  }
}

export function analyzeProject(projectRoot, options = {}) {
  const { config } = loadAnalyzerConfig(projectRoot, options.config)
  const manifest = detectProject(projectRoot, config)
  const routes = applyMounts(collectRoutes(projectRoot, manifest), manifest)
  const edges = manifest.apps.flatMap((app) => extractNavigationEdges(projectRoot, app))

  return {
    analyzedAt: new Date().toISOString(),
    project: {
      root: projectRoot,
      isMonorepo: manifest.apps.length > 1,
      manifest,
    },
    routes,
    edges,
    stats: buildStats(routes, edges),
  }
}
