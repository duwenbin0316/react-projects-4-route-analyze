import { Link, useHistory } from 'react-router-dom'
import { jumpTo } from '@samples/shared-nav'

function HostDashboard() {
  const history = useHistory()

  return (
    <section>
      <h1>Host Dashboard</h1>
      <Link to="/trade/list">Trade List</Link>
      <button onClick={() => jumpTo(history, '/risk/report', { source: 'host' })}>
        Shared jump to risk
      </button>
    </section>
  )
}

export default HostDashboard
