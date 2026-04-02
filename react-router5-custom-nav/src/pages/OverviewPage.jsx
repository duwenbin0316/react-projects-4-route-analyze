import { useHistory } from 'react-router-dom'
import CorpLink from '../navigation/CorpLink.jsx'
import { jumpTo } from '../navigation/customNavigator.jsx'

function OverviewPage() {
  const history = useHistory()

  return (
    <section>
      <h2>Overview</h2>
      <button
        onClick={() =>
          jumpTo(history, '/trade/detail/1001', { from: 'overview' }, { source: 'hero-card' })
        }
      >
        jumpTo detail
      </button>
      <div style={{ marginTop: 12 }}>
        <CorpLink to="/risk/report" query={{ level: 'high' }}>
          Open risk report
        </CorpLink>
      </div>
    </section>
  )
}

export default OverviewPage
