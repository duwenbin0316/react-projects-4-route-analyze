import { Redirect, Route, Switch } from 'react-router-dom'
import AnalyticsPage from './views/AnalyticsPage.jsx'
import DashboardPage from './views/DashboardPage.jsx'
import OrdersPage from './views/OrdersPage.jsx'
import ProductListPage from './views/ProductListPage.jsx'
import ProductPricePage from './views/ProductPricePage.jsx'
import ReportDailyPage from './views/ReportDailyPage.jsx'

export const routeConfig = [
  {
    path: '/dashboard',
    component: DashboardPage,
  },
  {
    path: '/products/list',
    component: ProductListPage,
  },
  {
    path: '/products/pricing',
    component: ProductPricePage,
  },
  {
    path: '/orders',
    component: OrdersPage,
  },
  {
    path: '/reports/daily',
    component: ReportDailyPage,
  },
  {
    path: '/analytics',
    component: AnalyticsPage,
  },
]

export function renderRoutes() {
  return (
    <Switch>
      <Route exact path="/">
        <Redirect to="/dashboard" />
      </Route>
      {routeConfig.map((route) => (
        <Route key={route.path} exact path={route.path} component={route.component} />
      ))}
    </Switch>
  )
}
