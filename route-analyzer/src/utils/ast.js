import { parse } from '@babel/parser'
import traverse from '@babel/traverse'

export function parseFile(code, filePath) {
  return parse(code, {
    sourceType: 'unambiguous',
    sourceFilename: filePath,
    plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'dynamicImport'],
  })
}

export function walk(ast, visitor) {
  return traverse.default(ast, visitor)
}
