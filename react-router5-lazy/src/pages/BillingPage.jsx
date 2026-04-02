import { Link } from 'react-router-dom'

function BillingPage() {
  return (
    <section>
      <h2>Billing</h2>
      <Link to="/settings/audit">Open audit trail</Link>
    </section>
  )
}

export default BillingPage
