import { Link, Redirect, Route, Switch } from 'react-router-dom'
import { riskRoutes } from '../router/routes'

function RiskMount() {
  return (
    <section>
      <h2>Risk Mount</h2>
      <Link to="/trade/list">Back to trade app</Link>
      <Switch>
        <Route exact path="/risk">
          <Redirect to="/risk/report" />
        </Route>
        {riskRoutes.map((route) => (
          <Route key={route.path} path={`/risk${route.path}`} component={route.component} />
        ))}
      </Switch>
    </section>
  )
}

export default RiskMount
