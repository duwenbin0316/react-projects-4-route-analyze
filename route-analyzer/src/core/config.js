import path from 'path'
import YAML from 'yaml'
import { globSync } from 'glob'
import { exists, readJson, readText } from '../utils/fs.js'

export function loadAnalyzerConfig(projectRoot, configPath) {
  const resolvedPath = configPath
    ? path.resolve(projectRoot, configPath)
    : path.join(projectRoot, 'route-analyzer.json')

  if (!exists(resolvedPath)) {
    return { path: resolvedPath, config: {} }
  }

  return { path: resolvedPath, config: readJson(resolvedPath) }
}

export function loadWorkspacePatterns(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const pnpmWorkspacePath = path.join(projectRoot, 'pnpm-workspace.yaml')

  if (exists(packageJsonPath)) {
    const packageJson = readJson(packageJsonPath)
    if (Array.isArray(packageJson.workspaces)) return packageJson.workspaces
    if (Array.isArray(packageJson.workspaces?.packages)) return packageJson.workspaces.packages
  }

  if (exists(pnpmWorkspacePath)) {
    const workspaceConfig = YAML.parse(readText(pnpmWorkspacePath))
    if (Array.isArray(workspaceConfig?.packages)) return workspaceConfig.packages
  }

  return null
}

export function expandWorkspacePatterns(projectRoot, patterns) {
  if (!patterns?.length) return []
  return patterns.flatMap((pattern) =>
    globSync(pattern, {
      cwd: projectRoot,
      absolute: true,
      onlyDirectories: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
    }),
  )
}
