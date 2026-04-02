import { Link, useParams } from 'react-router-dom'

function TradeDetailPage() {
  const { id } = useParams()

  return (
    <section>
      <h2>Trade Detail</h2>
      <p>Current id: {id}</p>
      <Link to="/trade/list">Back to trade list</Link>
    </section>
  )
}

export default TradeDetailPage
