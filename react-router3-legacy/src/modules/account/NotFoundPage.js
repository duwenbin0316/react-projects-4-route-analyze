import React from 'react'
import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <section>
      <h2>404</h2>
      <Link to="/dashboard">Back to dashboard</Link>
    </section>
  )
}

export default NotFoundPage
