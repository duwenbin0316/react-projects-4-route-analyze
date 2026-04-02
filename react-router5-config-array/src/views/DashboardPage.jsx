import { Link } from 'react-router-dom'

function DashboardPage() {
  return (
    <section>
      <h2>Dashboard</h2>
      <p>This sample keeps route declarations in a config array.</p>
      <Link to="/analytics">Go to analytics</Link>
    </section>
  )
}

export default DashboardPage
