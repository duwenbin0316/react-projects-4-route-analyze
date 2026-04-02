import { useLocation } from 'react-router-dom'

function ReportDailyPage() {
  const location = useLocation()

  return (
    <section>
      <h2>Daily Report</h2>
      <pre>{JSON.stringify({ search: location.search, state: location.state }, null, 2)}</pre>
    </section>
  )
}

export default ReportDailyPage
