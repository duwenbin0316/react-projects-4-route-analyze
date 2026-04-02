import React from 'react'
import {
  IndexRoute,
  Route,
  Router,
  browserHistory,
} from 'react-router'
import AppLayout from '../containers/AppLayout'
import DashboardPage from '../modules/account/DashboardPage'
import LoginPage from '../modules/account/LoginPage'
import NotFoundPage from '../modules/account/NotFoundPage'
import TradeDetailPage from '../modules/trade/TradeDetailPage'
import TradeListPage from '../modules/trade/TradeListPage'
import RiskReportPage from '../modules/risk/RiskReportPage'

function requireLogin(nextState, replace) {
  const token = window.sessionStorage.getItem('legacy-token')

  if (!token) {
    replace('/login?from=' + nextState.location.pathname)
  }
}

const routes = (
  <Router history={browserHistory}>
    <Route path="/" component={AppLayout}>
      <IndexRoute component={DashboardPage} />
      <Route path="login" component={LoginPage} />
      <Route path="dashboard" component={DashboardPage} onEnter={requireLogin} />
      <Route path="trade">
        <IndexRoute component={TradeListPage} />
        <Route path="list" component={TradeListPage} />
        <Route path="detail/:id" component={TradeDetailPage} />
      </Route>
      <Route
        path="risk"
        getChildRoutes={(location, cb) => {
          cb(null, [
            {
              path: 'report',
              component: RiskReportPage,
            },
            {
              path: 'rules',
              getComponent(nextState, callback) {
                require.ensure([], (requireRef) => {
                  callback(null, requireRef('../modules/risk/RiskRulesPage').default)
                })
              },
            },
          ])
        }}
      />
      <Route path="*" component={NotFoundPage} />
    </Route>
  </Router>
)

export { requireLogin }
export default routes
