function createSearch(query) {
  if (!query) return ''
  return `?${new URLSearchParams(query).toString()}`
}

export function jumpTo(history, path, query, state) {
  history.push({
    pathname: path,
    search: createSearch(query),
    state,
  })
}

export function replaceWith(history, path) {
  history.replace(path)
}
