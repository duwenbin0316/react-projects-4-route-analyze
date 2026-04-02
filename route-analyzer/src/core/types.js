export function buildSourceLoc(node) {
  return {
    start: {
      line: node?.loc?.start?.line || 0,
      column: node?.loc?.start?.column || 0,
    },
    end: {
      line: node?.loc?.end?.line || 0,
      column: node?.loc?.end?.column || 0,
    },
  }
}
