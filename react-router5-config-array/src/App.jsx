import { Link, useHistory, useLocation } from 'react-router-dom'
import { renderRoutes, routeConfig } from './routes.jsx'

const quickLinks = routeConfig.filter((item) => item.path !== '/dashboard')

function App() {
  const history = useHistory()
  const location = useLocation()

  return (
    <div style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <p>Sample: config array routes</p>
        <h1 style={{ margin: '8px 0' }}>react-router5-config-array</h1>
        <button
          onClick={() =>
            history.push({
              pathname: '/reports/daily',
              search: '?from=dashboard',
              state: { source: location.pathname },
            })
          }
        >
          history.push object form
        </button>
      </header>

      <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {quickLinks.map((route) => (
          <Link key={route.path} to={route.path}>
            {route.path}
          </Link>
        ))}
      </nav>

      {renderRoutes()}
    </div>
  )
}

export default App
