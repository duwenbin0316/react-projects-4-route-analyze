import { Link } from 'react-router-dom'

function createSearch(query) {
  if (!query) return ''
  return `?${new URLSearchParams(query).toString()}`
}

function CorpLink({ to, query, children }) {
  return <Link to={{ pathname: to, search: createSearch(query) }}>{children}</Link>
}

export default CorpLink
