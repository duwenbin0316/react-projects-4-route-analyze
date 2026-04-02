import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <section>
      <h2>Home</h2>
      <Link to="/profile">Open profile</Link>
    </section>
  )
}

export default HomePage
