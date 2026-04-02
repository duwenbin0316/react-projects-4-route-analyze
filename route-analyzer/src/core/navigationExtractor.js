import path from 'path'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { globSync } from 'glob'
import { parseFile, walk } from '../utils/ast.js'
import { buildSourceLoc } from './types.js'
import { readText, toRelative } from '../utils/fs.js'
import { parseQueryString, stripQueryAndHash } from '../utils/path.js'

function buildImportContext(ast, filePath, aliasResolver) {
  const imports = []
  const byLocal = new Map()

  walk(ast, {
    ImportDeclaration(pathRef) {
      const source = pathRef.node.source.value
      const resolved = aliasResolver.resolve(source, filePath)
      for (const specifier of pathRef.node.specifiers) {
        const localName = specifier.local.name
        const importedName = specifier.imported?.name || 'default'
        byLocal.set(localName, {
          rawSource: source,
          source: resolved ? aliasResolver.toProjectRelative(resolved) : `unresolved:${source}`,
          importedName,
        })
      }
      imports.push(generate.default(pathRef.node).code)
    },
  })

  return { imports, byLocal }
}

function buildNavigationBindings(ast, importContext) {
  const useNavigateFns = new Set()
  const historyObjects = new Set(['history', 'browserHistory'])
  const routeGuardHandlers = new Set()

  walk(ast, {
    JSXAttribute(pathRef) {
      if (
        t.isJSXIdentifier(pathRef.node.name, { name: 'onEnter' }) &&
        t.isJSXExpressionContainer(pathRef.node.value) &&
        t.isIdentifier(pathRef.node.value.expression)
      ) {
        routeGuardHandlers.add(pathRef.node.value.expression.name)
      }
    },
    ObjectProperty(pathRef) {
      if (t.isIdentifier(pathRef.node.key, { name: 'onEnter' }) && t.isIdentifier(pathRef.node.value)) {
        routeGuardHandlers.add(pathRef.node.value.name)
      }
    },
    VariableDeclarator(pathRef) {
      if (!t.isIdentifier(pathRef.node.id) || !t.isCallExpression(pathRef.node.init)) return
      const callee = pathRef.node.init.callee
      if (!t.isIdentifier(callee)) return
      const imported = importContext.byLocal.get(callee.name)
      if (!imported) return

      if (imported.importedName === 'useNavigate') {
        useNavigateFns.add(pathRef.node.id.name)
      }

      if (imported.importedName === 'useHistory') {
        historyObjects.add(pathRef.node.id.name)
      }
    },
  })

  return { useNavigateFns, historyObjects, routeGuardHandlers }
}

function findEnclosingComponent(pathRef) {
  const functionPath = pathRef.findParent(
    (candidate) =>
      candidate.isFunctionDeclaration() ||
      candidate.isFunctionExpression() ||
      candidate.isArrowFunctionExpression() ||
      candidate.isClassMethod() ||
      candidate.isClassDeclaration(),
  )

  if (!functionPath) return undefined
  if (functionPath.node.id?.name) return functionPath.node.id.name
  if (functionPath.parentPath?.isVariableDeclarator() && t.isIdentifier(functionPath.parentPath.node.id)) {
    return functionPath.parentPath.node.id.name
  }
  if (functionPath.parentPath?.isClassDeclaration()) return functionPath.parentPath.node.id?.name
  return undefined
}

function literalParam(value) {
  return { type: 'literal', value }
}

function unresolvedParam(expression) {
  return { type: 'unresolved', expression }
}

function resolveParamValue(node) {
  if (!node) return undefined
  if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) {
    return literalParam(node.value)
  }
  if (t.isTemplateLiteral(node)) {
    return {
      type: 'template',
      template: generate.default(node).code,
      variables: node.expressions.map((expression) => generate.default(expression).code),
    }
  }
  return unresolvedParam(generate.default(node).code)
}

function resolveObjectExpression(node) {
  if (!t.isObjectExpression(node)) return undefined
  const result = {}
  for (const property of node.properties) {
    if (!t.isObjectProperty(property)) continue
    const key = t.isIdentifier(property.key) ? property.key.name : property.key.value
    result[key] = resolveParamValue(property.value)
  }
  return Object.keys(result).length ? result : undefined
}

function parsePathLiteral(value) {
  const [beforeHash, hashPart] = value.split('#')
  const [pathname, searchPart] = beforeHash.split('?')

  return {
    path: stripQueryAndHash(pathname),
    params: {
      query: parseQueryString(searchPart),
      hash: hashPart,
    },
  }
}

function buildTemplatePath(node) {
  const quasis = node.quasis.map((item) => item.value.cooked || '')
  let pattern = ''
  for (let index = 0; index < quasis.length; index += 1) {
    pattern += quasis[index]
    if (index < node.expressions.length) pattern += `:$${index}`
  }
  return pattern
}

function extractNavigationTarget(node) {
  if (!node) {
    return {
      to: {},
      params: {},
      confidence: 'low',
    }
  }

  if (t.isStringLiteral(node)) {
    const parsed = parsePathLiteral(node.value)
    return {
      to: { path: parsed.path },
      params: parsed.params,
      confidence: 'high',
    }
  }

  if (t.isTemplateLiteral(node)) {
    return {
      to: { path: buildTemplatePath(node), rawExpression: generate.default(node).code },
      params: {
        pathParams: node.expressions.reduce((acc, expression, index) => {
          acc[`$${index}`] = {
            type: 'template',
            template: generate.default(node).code,
            variables: [generate.default(expression).code],
          }
          return acc
        }, {}),
      },
      confidence: 'medium',
    }
  }

  if (t.isObjectExpression(node)) {
    const pathnameProp = node.properties.find(
      (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'pathname' }),
    )
    const searchProp = node.properties.find(
      (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'search' }),
    )
    const queryProp = node.properties.find(
      (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'query' }),
    )
    const stateProp = node.properties.find(
      (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'state' }),
    )
    const hashProp = node.properties.find(
      (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'hash' }),
    )

    const pathnameNode = pathnameProp?.value
    const to = t.isStringLiteral(pathnameNode)
      ? { path: pathnameNode.value }
      : pathnameNode
        ? { rawExpression: generate.default(pathnameNode).code }
        : {}

    return {
      to,
      params: {
        query: queryProp ? resolveObjectExpression(queryProp.value) : searchProp && t.isStringLiteral(searchProp.value)
          ? Object.fromEntries(new URLSearchParams(searchProp.value.value.replace(/^\?/, '')).entries())
          : searchProp
            ? { value: resolveParamValue(searchProp.value) }
            : undefined,
        state: stateProp ? resolveObjectExpression(stateProp.value) : undefined,
        hash: hashProp && t.isStringLiteral(hashProp.value) ? hashProp.value.value : undefined,
      },
      confidence: t.isStringLiteral(pathnameNode) ? 'high' : 'low',
    }
  }

  return {
    to: { rawExpression: generate.default(node).code },
    params: {},
    confidence: 'low',
  }
}

function isHistoryLike(expression, bindings) {
  const code = generate.default(expression).code
  return (
    (t.isIdentifier(expression) && bindings.historyObjects.has(expression.name)) ||
    /(history|browserHistory|router)$/.test(code) ||
    code.includes('.history') ||
    code.includes('.router')
  )
}

function buildEdge({ appName, filePath, fromPath, method, node, target, componentName }) {
  return {
    app: appName,
    from: {
      file: fromPath,
      componentName,
      line: node?.loc?.start?.line || 0,
    },
    to: target.to,
    method,
    params: target.params,
    confidence: target.confidence,
    resolvedBy: 'ast',
    loc: buildSourceLoc(node),
  }
}

function importMatches(importContext, localName, moduleName, aliasResolver, filePath) {
  const imported = importContext.byLocal.get(localName)
  if (!imported) return false
  if (imported.rawSource === moduleName || imported.source === moduleName || imported.source.endsWith(moduleName)) {
    return true
  }
  const resolvedModule = moduleName.startsWith('.')
    ? aliasResolver.resolveFromAppRoot(moduleName) || aliasResolver.resolve(moduleName, filePath)
    : aliasResolver.resolve(moduleName, filePath)
  if (!resolvedModule) return false
  return imported.source === aliasResolver.toProjectRelative(resolvedModule)
}

function extractJsxEdge(pathRef, importContext, customNavigators, projectRoot, appName, filePath, aliasResolver) {
  const name = pathRef.node.openingElement.name
  const elementName = t.isJSXIdentifier(name) ? name.name : t.isJSXMemberExpression(name) ? name.property.name : null
  if (!elementName) return null

  const customComponent = customNavigators.find((item) => item.name === elementName)
  const isBuiltIn = ['Link', 'NavLink', 'Redirect'].includes(elementName)
  if (!isBuiltIn && !customComponent) return null

  const toAttribute = pathRef.node.openingElement.attributes.find(
    (attribute) =>
      t.isJSXAttribute(attribute) &&
      t.isJSXIdentifier(attribute.name) &&
      ['to', 'href'].includes(attribute.name.name),
  )
  if (!toAttribute) return null

  const targetNode = t.isJSXExpressionContainer(toAttribute.value)
    ? toAttribute.value.expression
    : toAttribute.value

  const target = extractNavigationTarget(targetNode)
  const componentName = findEnclosingComponent(pathRef)
  const fromPath = toRelative(projectRoot, filePath)

  if (customComponent && !importMatches(importContext, elementName, customComponent.module, aliasResolver, filePath)) {
    return null
  }

  return buildEdge({
    appName,
    filePath,
    fromPath,
    method: elementName === 'Redirect' ? 'redirect' : elementName,
    node: pathRef.node,
    target,
    componentName,
  })
}

function isRouteGuardReplace(pathRef) {
  const callee = pathRef.node.callee
  if (!t.isIdentifier(callee, { name: 'replace' })) return false
  const functionPath = pathRef.findParent(
    (candidate) =>
      candidate.isArrowFunctionExpression() ||
      candidate.isFunctionExpression() ||
      candidate.isFunctionDeclaration() ||
      candidate.isObjectMethod(),
  )
  if (!functionPath) return false
  const hasReplaceParam = functionPath.node.params?.some((param) => t.isIdentifier(param, { name: 'replace' }))
  if (!hasReplaceParam) return false

  const ownerProperty = functionPath.parentPath?.isObjectProperty() ? functionPath.parentPath.node.key : functionPath.node.key
  return Boolean(ownerProperty && t.isIdentifier(ownerProperty, { name: 'onEnter' }))
}

function isNamedGuardReplace(pathRef, bindings) {
  const callee = pathRef.node.callee
  if (!t.isIdentifier(callee, { name: 'replace' })) return false
  const functionPath = pathRef.findParent(
    (candidate) =>
      candidate.isFunctionDeclaration() ||
      candidate.isFunctionExpression() ||
      candidate.isArrowFunctionExpression(),
  )
  if (!functionPath) return false
  const hasReplaceParam = functionPath.node.params?.some((param) => t.isIdentifier(param, { name: 'replace' }))
  if (!hasReplaceParam) return false

  const functionName = functionPath.node.id?.name ||
    (functionPath.parentPath?.isVariableDeclarator() && t.isIdentifier(functionPath.parentPath.node.id)
      ? functionPath.parentPath.node.id.name
      : null)
  return Boolean(functionName && bindings.routeGuardHandlers.has(functionName))
}

function extractCallEdge(pathRef, importContext, customNavigators, projectRoot, appName, filePath, aliasResolver, bindings) {
  const callee = pathRef.node.callee
  const fromPath = toRelative(projectRoot, filePath)
  const componentName = findEnclosingComponent(pathRef)

  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    const method = callee.property.name
    if (['push', 'replace'].includes(method) && isHistoryLike(callee.object, bindings)) {
      const target = extractNavigationTarget(pathRef.node.arguments[0])
      return buildEdge({
        appName,
        filePath,
        fromPath,
        method: `history.${method}`,
        node: pathRef.node,
        target,
        componentName,
      })
    }
  }

  const calleeName = t.isIdentifier(callee) ? callee.name : null
  if (!calleeName) return null

  if (bindings.useNavigateFns.has(calleeName)) {
    const target = extractNavigationTarget(pathRef.node.arguments[0])
    return buildEdge({
      appName,
      filePath,
      fromPath,
      method: 'useNavigate',
      node: pathRef.node,
      target,
      componentName,
    })
  }

  if (isRouteGuardReplace(pathRef) || isNamedGuardReplace(pathRef, bindings)) {
    const target = extractNavigationTarget(pathRef.node.arguments[0])
    return buildEdge({
      appName,
      filePath,
      fromPath,
      method: 'redirect',
      node: pathRef.node,
      target,
      componentName,
    })
  }

  const customNavigator = customNavigators.find((item) => item.name === calleeName)
  if (!customNavigator) return null
  if (!importMatches(importContext, calleeName, customNavigator.module, aliasResolver, filePath)) return null

  const pathArg = pathRef.node.arguments[customNavigator.pathArgIndex]
  const queryArg =
    customNavigator.queryArgIndex != null ? pathRef.node.arguments[customNavigator.queryArgIndex] : null
  const stateArg =
    customNavigator.stateArgIndex != null ? pathRef.node.arguments[customNavigator.stateArgIndex] : null
  const target = extractNavigationTarget(pathArg)
  if (queryArg) target.params.query = resolveObjectExpression(queryArg) || { value: resolveParamValue(queryArg) }
  if (stateArg) target.params.state = resolveObjectExpression(stateArg) || { value: resolveParamValue(stateArg) }

  return buildEdge({
    appName,
    filePath,
    fromPath,
    method: calleeName,
    node: pathRef.node,
    target,
    componentName,
  })
}

function extractAssignmentEdge(pathRef, projectRoot, appName, filePath) {
  const left = pathRef.node.left
  if (
    !t.isMemberExpression(left) ||
    !t.isIdentifier(left.property, { name: 'href' }) ||
    !t.isMemberExpression(left.object)
  ) {
    return null
  }

  const objectCode = generate.default(left.object).code
  if (!['window.location', 'location'].includes(objectCode)) return null
  const target = extractNavigationTarget(pathRef.node.right)

  return buildEdge({
    appName,
    filePath,
    fromPath: toRelative(projectRoot, filePath),
    method: 'window.location',
    node: pathRef.node,
    target,
    componentName: findEnclosingComponent(pathRef),
  })
}

export function extractNavigationEdges(projectRoot, app, aliasResolver) {
  const appRoot = path.resolve(projectRoot, app.root)
  const files = globSync('src/**/*.{js,jsx,ts,tsx}', {
    cwd: appRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*', '**/__tests__/**'],
  })
  const edges = []

  for (const filePath of files) {
    const code = readText(filePath)
    if (!/(Link|NavLink|Redirect|push|replace|router|browserHistory|history|navigate)/.test(code)) continue
    const ast = parseFile(code, filePath)
    const importContext = buildImportContext(ast, filePath, aliasResolver)
    const bindings = buildNavigationBindings(ast, importContext)

    walk(ast, {
      JSXElement(pathRef) {
        const edge = extractJsxEdge(
          pathRef,
          importContext,
          app.customNavigators || [],
          appRoot,
          app.name,
          filePath,
          aliasResolver,
        )
        if (edge) edges.push(edge)
      },
      CallExpression(pathRef) {
        const edge = extractCallEdge(
          pathRef,
          importContext,
          app.customNavigators || [],
          appRoot,
          app.name,
          filePath,
          aliasResolver,
          bindings,
        )
        if (edge) edges.push(edge)
      },
      AssignmentExpression(pathRef) {
        const edge = extractAssignmentEdge(pathRef, appRoot, app.name, filePath)
        if (edge) edges.push(edge)
      },
    })
  }

  return edges
}
