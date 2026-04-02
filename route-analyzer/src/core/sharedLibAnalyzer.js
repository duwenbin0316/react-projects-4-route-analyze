import path from 'path'
import * as t from '@babel/types'
import { globSync } from 'glob'
import { parseFile, walk } from '../utils/ast.js'
import { readText } from '../utils/fs.js'

function buildTraversalFile(name, functionNode) {
  if (t.isFunctionDeclaration(functionNode)) {
    return t.file(t.program([functionNode]))
  }

  return t.file(
    t.program([
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(name), functionNode),
      ]),
    ]),
  )
}

function getExportedFunctions(ast) {
  const exported = []

  walk(ast, {
    ExportNamedDeclaration(pathRef) {
      const declaration = pathRef.node.declaration
      if (t.isFunctionDeclaration(declaration) && declaration.id) {
        exported.push({ name: declaration.id.name, node: declaration })
      }

      if (t.isVariableDeclaration(declaration)) {
        for (const declarator of declaration.declarations) {
          if (
            t.isIdentifier(declarator.id) &&
            (t.isArrowFunctionExpression(declarator.init) || t.isFunctionExpression(declarator.init))
          ) {
            exported.push({ name: declarator.id.name, node: declarator.init })
          }
        }
      }
    },
  })

  return exported
}

function findParamIndex(functionNode, name) {
  return functionNode.params.findIndex((param) => t.isIdentifier(param, { name }))
}

function findQueryArgIndex(valueNode, functionNode) {
  if (t.isIdentifier(valueNode)) return findParamIndex(functionNode, valueNode.name)
  if (t.isCallExpression(valueNode)) {
    for (const arg of valueNode.arguments) {
      if (t.isIdentifier(arg)) {
        const index = findParamIndex(functionNode, arg.name)
        if (index >= 0) return index
      }
    }
  }
  return -1
}

function inferFromNavigationCall(name, functionNode) {
  let descriptor = null

  walk(
    buildTraversalFile(name, t.cloneNode(functionNode, true)),
    {
      CallExpression(pathRef) {
        if (descriptor) return
        const callee = pathRef.node.callee
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) return
        if (!['push', 'replace'].includes(callee.property.name)) return

        const firstArg = pathRef.node.arguments[0]
        if (t.isIdentifier(firstArg)) {
          const pathArgIndex = findParamIndex(functionNode, firstArg.name)
          if (pathArgIndex >= 0) {
            descriptor = { name, pathArgIndex }
          }
          return
        }

        if (!t.isObjectExpression(firstArg)) return
        const pathnameProp = firstArg.properties.find(
          (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'pathname' }),
        )
        const searchProp = firstArg.properties.find(
          (property) =>
            t.isObjectProperty(property) &&
            (t.isIdentifier(property.key, { name: 'search' }) || t.isIdentifier(property.key, { name: 'query' })),
        )
        const stateProp = firstArg.properties.find(
          (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'state' }),
        )

        if (pathnameProp && t.isIdentifier(pathnameProp.value)) {
          const pathArgIndex = findParamIndex(functionNode, pathnameProp.value.name)
          if (pathArgIndex >= 0) {
            const queryArgIndex = searchProp ? findQueryArgIndex(searchProp.value, functionNode) : -1
            const stateArgIndex =
              stateProp && t.isIdentifier(stateProp.value)
                ? findParamIndex(functionNode, stateProp.value.name)
                : -1
            descriptor = {
              name,
              pathArgIndex,
              queryArgIndex: queryArgIndex >= 0 ? queryArgIndex : undefined,
              stateArgIndex: stateArgIndex >= 0 ? stateArgIndex : undefined,
            }
          }
        }
      },
    },
    undefined,
    {},
  )

  return descriptor
}

function inferFromLinkWrapper(name, functionNode) {
  let descriptor = null

  walk(
    buildTraversalFile(name, t.cloneNode(functionNode, true)),
    {
      JSXElement(pathRef) {
        if (descriptor) return
        const elementName = t.isJSXIdentifier(pathRef.node.openingElement.name)
          ? pathRef.node.openingElement.name.name
          : null
        if (!['Link', 'NavLink'].includes(elementName)) return

        const toAttr = pathRef.node.openingElement.attributes.find(
          (attribute) =>
            t.isJSXAttribute(attribute) &&
            t.isJSXIdentifier(attribute.name, { name: 'to' }) &&
            t.isJSXExpressionContainer(attribute.value),
        )
        if (!toAttr) return
        const expr = toAttr.value.expression
        if (t.isIdentifier(expr)) {
          const pathArgIndex = findParamIndex(functionNode, expr.name)
          if (pathArgIndex >= 0) descriptor = { name, pathArgIndex }
          return
        }

        if (!t.isObjectExpression(expr)) return
        const pathnameProp = expr.properties.find(
          (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'pathname' }),
        )
        const searchProp = expr.properties.find(
          (property) =>
            t.isObjectProperty(property) &&
            (t.isIdentifier(property.key, { name: 'search' }) || t.isIdentifier(property.key, { name: 'query' })),
        )
        if (pathnameProp && t.isIdentifier(pathnameProp.value)) {
          const pathArgIndex = findParamIndex(functionNode, pathnameProp.value.name)
          if (pathArgIndex >= 0) {
            const queryArgIndex = searchProp ? findQueryArgIndex(searchProp.value, functionNode) : -1
            descriptor = {
              name,
              pathArgIndex,
              queryArgIndex: queryArgIndex >= 0 ? queryArgIndex : undefined,
            }
          }
        }
      },
    },
    undefined,
    {},
  )

  return descriptor
}

function inferNavigatorDescriptor(exportedFunction) {
  const functionNode = exportedFunction.node
  return inferFromNavigationCall(exportedFunction.name, functionNode) ||
    inferFromLinkWrapper(exportedFunction.name, functionNode)
}

function packageRootByName(projectRoot, manifest, packageName) {
  const pkg = (manifest.packageIndex || []).find((entry) => entry.name === packageName)
  return pkg ? path.resolve(projectRoot, pkg.root) : null
}

export function analyzeSharedLibs(projectRoot, manifest) {
  const discovered = []

  for (const packageName of manifest.sharedLibs || []) {
    const root = packageRootByName(projectRoot, manifest, packageName)
    if (!root) continue

    const files = globSync('src/**/*.{js,jsx,ts,tsx}', {
      cwd: root,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
    })

    for (const filePath of files) {
      const ast = parseFile(readText(filePath), filePath)
      const exportedFunctions = getExportedFunctions(ast)
      for (const exportedFunction of exportedFunctions) {
        const descriptor = inferNavigatorDescriptor(exportedFunction)
        if (!descriptor) continue
        discovered.push({
          ...descriptor,
          module: packageName,
        })
      }
    }
  }

  const deduped = []
  const seen = new Set()
  for (const item of discovered) {
    const key = `${item.module}|${item.name}|${item.pathArgIndex}|${item.queryArgIndex ?? ''}|${item.stateArgIndex ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

export function mergeCustomNavigators(manifest, discoveredNavigators) {
  return {
    ...manifest,
    apps: manifest.apps.map((app) => {
      const manual = app.customNavigators || []
      const manualKeys = new Set(manual.map((item) => `${item.module}|${item.name}`))
      const merged = [
        ...manual,
        ...discoveredNavigators.filter((item) => !manualKeys.has(`${item.module}|${item.name}`)),
      ]
      return {
        ...app,
        customNavigators: merged,
      }
    }),
  }
}
