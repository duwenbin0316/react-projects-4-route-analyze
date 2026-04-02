import TradeDetail from '../views/TradeDetail.jsx'
import TradeList from '../views/TradeList.jsx'

export const tradeRoutes = [
  {
    path: '/list',
    component: TradeList,
  },
  {
    path: '/detail/:id',
    component: TradeDetail,
  },
]
