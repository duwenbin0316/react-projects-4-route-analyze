import { matchRoutePattern } from '../utils/path.js'

export function analyzeImpact(target, analysisResult) {
  const targetRoutes = analysisResult.routes.filter(
    (route) => route.path === target || route.componentFile === target,
  )

  const directSources = analysisResult.edges
    .filter((edge) => targetRoutes.some((route) => edge.to.path && matchRoutePattern(edge.to.path, route.path)))
    .map((edge) => ({
      file: edge.from.file,
      component: edge.from.componentName,
      method: edge.method,
      params: edge.params,
      confidence: edge.confidence,
    }))

  const paramDependencies = {}
  for (const source of directSources) {
    if (!source.params?.pathParams) continue
    for (const key of Object.keys(source.params.pathParams)) {
      paramDependencies[key] = 'required'
    }
  }

  return {
    target: targetRoutes,
    directSources,
    paramDependencies,
  }
}
