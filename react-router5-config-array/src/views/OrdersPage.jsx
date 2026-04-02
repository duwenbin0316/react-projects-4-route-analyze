import { useHistory } from 'react-router-dom'

function OrdersPage() {
  const history = useHistory()

  return (
    <section>
      <h2>Orders</h2>
      <button onClick={() => history.replace('/products/list')}>history.replace back to products</button>
    </section>
  )
}

export default OrdersPage
