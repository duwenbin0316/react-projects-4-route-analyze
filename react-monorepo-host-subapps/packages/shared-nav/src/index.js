export function jumpTo(history, path, query) {
  const search = query ? `?${new URLSearchParams(query).toString()}` : ''
  history.push({
    pathname: path,
    search,
  })
}
