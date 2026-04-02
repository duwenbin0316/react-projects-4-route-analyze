import { Link, useLocation } from 'react-router-dom'

function RiskReportPage() {
  const location = useLocation()

  return (
    <section>
      <h2>Risk Report</h2>
      <p>Current search: {location.search}</p>
      <Link to="/trade/list">View trade list</Link>
    </section>
  )
}

export default RiskReportPage
