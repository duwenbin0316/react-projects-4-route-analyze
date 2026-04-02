import { NavLink } from 'react-router-dom'

function ProductListPage() {
  return (
    <section>
      <h2>Product List</h2>
      <NavLink to="/products/pricing">Check pricing</NavLink>
    </section>
  )
}

export default ProductListPage
