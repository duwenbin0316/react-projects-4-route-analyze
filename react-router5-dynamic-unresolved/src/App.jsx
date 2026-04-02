import { Link, Redirect, Route, Switch, useHistory } from 'react-router-dom'
import { buildTradePath, getReportTarget } from './routeBuilders'

const currentTradeId = 'T-2048'
const selectedType = 'risk'

function HomePage() {
  const history = useHistory()
  const targetPath = buildTradePath(currentTradeId)
  const reportTarget = getReportTarget(selectedType)

  return (
    <section>
      <h2>Home</h2>
      <button onClick={() => history.push(targetPath)}>Open built trade path</button>
      <button onClick={() => history.push(`${reportTarget}?tab=summary`)}>Open dynamic report</button>
      <div>
        <Link to={{ pathname: buildTradePath(currentTradeId), state: { source: 'home-card' } }}>
          Link with builder
        </Link>
      </div>
    </section>
  )
}

function TradeDetailPage() {
  return <h2>Trade Detail</h2>
}

function RiskReportPage() {
  return <h2>Risk Report</h2>
}

function GeneralReportPage() {
  return <h2>General Report</h2>
}

function App() {
  return (
    <div style={{ padding: 28 }}>
      <h1>react-router5-dynamic-unresolved</h1>
      <p>Sample for unresolved dynamic expressions and helper-built targets.</p>
      <Switch>
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
        <Route exact path="/home" component={HomePage} />
        <Route exact path="/trade/detail/:id" component={TradeDetailPage} />
        <Route exact path="/reports/risk" component={RiskReportPage} />
        <Route exact path="/reports/general" component={GeneralReportPage} />
      </Switch>
    </div>
  )
}

export default App
