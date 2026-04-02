import { Link, Route, Switch, useHistory } from 'react-router-dom'
import { jumpTo } from '@samples/shared-nav'
import { tradeRoutes } from '../router/routes'

function TradeMount() {
  const history = useHistory()

  return (
    <section>
      <h2>Trade Mount</h2>
      <Link to="/trade/detail/42">Open trade detail</Link>
      <button onClick={() => jumpTo(history, '/risk/report', { from: 'trade-app' })}>
        Jump to risk app
      </button>
      <Switch>
        {tradeRoutes.map((route) => (
          <Route key={route.path} path={`/trade${route.path}`} component={route.component} />
        ))}
      </Switch>
    </section>
  )
}

export default TradeMount
