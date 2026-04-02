import fs from 'fs'
import path from 'path'

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

export function exists(filePath) {
  return fs.existsSync(filePath)
}

export function writeJson(filePath, value) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

export function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

export function toRelative(root, filePath) {
  return toPosixPath(path.relative(root, filePath))
}
