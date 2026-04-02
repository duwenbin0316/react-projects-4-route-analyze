import { Link, Redirect, Route, Switch } from 'react-router-dom'
import HostDashboard from '../views/HostDashboard.jsx'
import TradeMount from 'trade-app/src/bootstrap/TradeMount.jsx'
import RiskMount from 'risk-app/src/bootstrap/RiskMount.jsx'

function AppRouter() {
  return (
    <Switch>
      <Route exact path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route exact path="/dashboard" component={HostDashboard} />
      <Route path="/trade" component={TradeMount} />
      <Route path="/risk" component={RiskMount} />
      <Route path="*">
        <Link to="/dashboard">Back to dashboard</Link>
      </Route>
    </Switch>
  )
}

export default AppRouter
