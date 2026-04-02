import React from 'react'
import { Link, browserHistory } from 'react-router'

class DashboardPage extends React.Component {
  goToTradeDetail = () => {
    browserHistory.push('/trade/detail/9001?from=dashboard')
  }

  openRiskRules = () => {
    this.context.router.push('/risk/rules')
  }

  render() {
    return (
      <section>
        <h2>Dashboard</h2>
        <button onClick={this.goToTradeDetail}>browserHistory.push detail</button>
        <button onClick={this.openRiskRules}>context router push rules</button>
        <Link
          to={{
            pathname: '/trade/list',
            state: { source: 'dashboard-link' },
          }}
        >
          Open Trade List
        </Link>
      </section>
    )
  }
}

DashboardPage.contextTypes = {
  router: React.PropTypes.object,
}

export default DashboardPage
