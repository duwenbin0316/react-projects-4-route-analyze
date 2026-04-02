import { useHistory } from 'react-router-dom'
import { replaceWith } from '../navigation/customNavigator.jsx'

function TradeListPage() {
  const history = useHistory()

  return (
    <section>
      <h2>Trade List</h2>
      <button onClick={() => replaceWith(history, '/overview')}>Replace to overview</button>
    </section>
  )
}

export default TradeListPage
