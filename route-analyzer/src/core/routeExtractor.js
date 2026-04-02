import path from 'path'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { parseFile, walk } from '../utils/ast.js'
import { buildSourceLoc } from './types.js'
import { readText } from '../utils/fs.js'
import { joinRoutePath, normalizeRoutePath } from '../utils/path.js'

function buildImportMap(ast, filePath, aliasResolver) {
  const importMap = new Map()

  walk(ast, {
    ImportDeclaration(importPath) {
      const source = importPath.node.source.value
      const resolved = aliasResolver.resolve(source, filePath)
      for (const specifier of importPath.node.specifiers) {
        importMap.set(specifier.local.name, {
          importedName: specifier.imported?.name || 'default',
          rawSource: source,
          source: resolved ? aliasResolver.toProjectRelative(resolved) : `unresolved:${source}`,
        })
      }
    },
  })

  return importMap
}

function getJsxName(node) {
  if (t.isJSXIdentifier(node)) return node.name
  if (t.isJSXMemberExpression(node)) return node.property.name
  return null
}

function getJsxAttribute(node, name) {
  return node.openingElement.attributes.find(
    (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name }),
  )
}

function resolveLiteralPath(node) {
  if (!node) return null
  if (t.isStringLiteral(node)) return node.value
  if (t.isJSXExpressionContainer(node) && t.isStringLiteral(node.expression)) return node.expression.value
  return null
}

function resolveComponent(node, importMap, aliasResolver, fromFile) {
  if (!node) return { componentFile: '', componentName: '' }
  const expression = t.isJSXExpressionContainer(node) ? node.expression : node

  if (t.isIdentifier(expression)) {
    const imported = importMap.get(expression.name)
    return {
        componentFile: imported?.source || '',
        componentName: expression.name,
        lazy: false,
      }
  }

  if (t.isCallExpression(expression)) {
    const code = generate.default(expression).code
    const lazyImport = /import\((['"`])(.+?)\1\)/.exec(code)
    if (lazyImport) {
      const resolved = aliasResolver.resolve(lazyImport[2], fromFile)
      return {
        componentFile: resolved ? aliasResolver.toProjectRelative(resolved) : `unresolved:${lazyImport[2]}`,
        componentName: 'default',
        lazy: true,
      }
    }
  }

  return {
    componentFile: '',
    componentName: '',
    lazy: false,
  }
}

function extractRequireEnsureComponent(objectNode, aliasResolver, fromFile) {
  for (const property of objectNode.properties) {
    if (!t.isObjectMethod(property) || !t.isIdentifier(property.key, { name: 'getComponent' })) continue
    const methodCode = generate.default(property.body).code
    const requireMatch = /requireRef\((['"`])(.+?)\1\)/.exec(methodCode)
    const resolved = requireMatch?.[2] ? aliasResolver.resolve(requireMatch[2], fromFile) : null
    return {
      componentFile: resolved ? aliasResolver.toProjectRelative(resolved) : requireMatch?.[2] ? `unresolved:${requireMatch[2]}` : '',
      componentName: 'default',
      lazy: true,
    }
  }

  return {
    componentFile: '',
    componentName: '',
    lazy: false,
  }
}

function extractRoutesFromConfigArray(arrayNode, parentPath, importMap, aliasResolver, fromFile) {
  return arrayNode.elements
    .filter((element) => t.isObjectExpression(element))
    .flatMap((element) => {
      const pathProp = element.properties.find(
        (property) =>
          t.isObjectProperty(property) &&
          t.isIdentifier(property.key, { name: 'path' }) &&
          t.isStringLiteral(property.value),
      )
      if (!pathProp) return []

      const componentProp = element.properties.find(
        (property) =>
          t.isObjectProperty(property) &&
          (t.isIdentifier(property.key, { name: 'component' }) || t.isIdentifier(property.key, { name: 'getComponent' })),
      )

      const component = componentProp && t.isObjectProperty(componentProp)
        ? resolveComponent(componentProp.value, importMap, aliasResolver, fromFile)
        : extractRequireEnsureComponent(element, aliasResolver, fromFile)

      return [
        {
          path: joinRoutePath(parentPath, pathProp.value.value),
          componentFile: component.componentFile || '',
          componentName: component.componentName || '',
          lazy: Boolean(component.lazy),
          children: [],
          source: 'ast',
          loc: buildSourceLoc(element),
        },
      ]
    })
}

function isRouteLikeArray(pathRef) {
  if (!pathRef.parentPath) return false

  if (pathRef.parentPath.isVariableDeclarator() && t.isIdentifier(pathRef.parentPath.node.id)) {
    return /routes?/i.test(pathRef.parentPath.node.id.name)
  }

  if (pathRef.parentPath.isAssignmentExpression() && t.isIdentifier(pathRef.parentPath.node.left)) {
    return /routes?/i.test(pathRef.parentPath.node.left.name)
  }

  if (pathRef.parentPath.isExportDefaultDeclaration() || pathRef.parentPath.isExportNamedDeclaration()) {
    return true
  }

  return false
}

function isNestedUnderRoute(pathRef) {
  return Boolean(
    pathRef.findParent((candidate) => {
      if (!candidate.isJSXElement()) return false
      const jsxName = getJsxName(candidate.node.openingElement.name)
      return ['Route', 'IndexRoute'].includes(jsxName)
    }),
  )
}

function extractChildRoutesFromAttribute(attribute, parentPath, importMap, aliasResolver, fromFile) {
  if (!attribute || !t.isJSXExpressionContainer(attribute.value)) return []
  const code = generate.default(attribute.value.expression).code
  const match = code.match(/cb\(null,\s*(\[[\s\S]*\])\s*\)/)
  if (!match) return []

  try {
    const wrapped = `(${match[1]})`
    const ast = parseFile(wrapped, 'inline-routes.js')
    const expression = ast.program.body[0].expression
    if (!t.isArrayExpression(expression)) return []
    return extractRoutesFromConfigArray(expression, parentPath, importMap, aliasResolver, fromFile)
  } catch {
    return []
  }
}

function extractJsxRoute(node, parentPath, importMap, aliasResolver, fromFile) {
  const routeName = getJsxName(node.openingElement.name)
  if (!routeName || !['Route', 'IndexRoute'].includes(routeName)) return null

  const pathAttribute = getJsxAttribute(node, 'path')
  const componentAttribute = getJsxAttribute(node, 'component') || getJsxAttribute(node, 'render')
  const getChildRoutesAttribute = getJsxAttribute(node, 'getChildRoutes')
  const isIndex = routeName === 'IndexRoute'
  const currentPath = joinRoutePath(parentPath, resolveLiteralPath(pathAttribute?.value), isIndex)
  const component = resolveComponent(componentAttribute?.value, importMap, aliasResolver, fromFile)

  const children = node.children
    .filter((child) => t.isJSXElement(child))
    .map((child) => extractJsxRoute(child, currentPath, importMap, aliasResolver, fromFile))
    .filter(Boolean)

  const callbackChildren = extractChildRoutesFromAttribute(
    getChildRoutesAttribute,
    currentPath,
    importMap,
    aliasResolver,
    fromFile,
  )

  return {
    path: normalizeRoutePath(currentPath),
    componentFile: component.componentFile || '',
    componentName: component.componentName || '',
    lazy: Boolean(component.lazy),
    children: [...children, ...callbackChildren],
    source: 'ast',
    loc: buildSourceLoc(node),
  }
}

function flattenRoutes(routes) {
  return routes.flatMap((route) => [route, ...(route.children ? flattenRoutes(route.children) : [])])
}

export function extractRoutesFromFile(projectRoot, absoluteFilePath, appName, aliasResolver) {
  const code = readText(absoluteFilePath)
  const ast = parseFile(code, absoluteFilePath)
  const importMap = buildImportMap(ast, absoluteFilePath, aliasResolver)
  const routes = []

  walk(ast, {
    JSXElement(pathRef) {
      const route = extractJsxRoute(pathRef.node, '', importMap, aliasResolver, absoluteFilePath)
      if (!route) return
      if (isNestedUnderRoute(pathRef.parentPath)) return
      routes.push(route)
    },
    ArrayExpression(pathRef) {
      if (!isRouteLikeArray(pathRef)) return
      const extracted = extractRoutesFromConfigArray(pathRef.node, '', importMap, aliasResolver, absoluteFilePath)
      for (const route of extracted) routes.push(route)
    },
  })

  const deduped = []
  const seen = new Set()
  for (const route of flattenRoutes(routes)) {
    const key = `${route.path}|${route.componentFile}|${route.componentName}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push({ ...route, app: appName })
  }

  return deduped
}
