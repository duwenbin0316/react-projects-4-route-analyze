import React from 'react'
import { browserHistory } from 'react-router'

function RiskReportPage() {
  const backToDashboard = () => {
    browserHistory.push({
      pathname: '/dashboard',
      query: { from: 'risk-report' },
    })
  }

  return (
    <section>
      <h2>Risk Report</h2>
      <button onClick={backToDashboard}>Back to dashboard</button>
    </section>
  )
}

export default RiskReportPage
