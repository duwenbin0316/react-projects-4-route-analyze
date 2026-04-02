import { Redirect, Route, Switch } from 'react-router-dom'
import OverviewPage from './pages/OverviewPage.jsx'
import TradeListPage from './pages/TradeListPage.jsx'
import TradeDetailPage from './pages/TradeDetailPage.jsx'
import RiskReportPage from './pages/RiskReportPage.jsx'

function App() {
  return (
    <div style={{ padding: 28 }}>
      <h1>react-router5-custom-nav</h1>
      <p>Sample for custom navigation methods and wrapped link components.</p>
      <Switch>
        <Route exact path="/">
          <Redirect to="/overview" />
        </Route>
        <Route exact path="/overview" component={OverviewPage} />
        <Route exact path="/trade/list" component={TradeListPage} />
        <Route exact path="/trade/detail/:id" component={TradeDetailPage} />
        <Route exact path="/risk/report" component={RiskReportPage} />
      </Switch>
    </div>
  )
}

export default App
