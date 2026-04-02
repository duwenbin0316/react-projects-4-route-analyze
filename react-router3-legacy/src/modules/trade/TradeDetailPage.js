import React from 'react'
import { Link } from 'react-router'

function TradeDetailPage(props) {
  return (
    <section>
      <h2>Trade Detail</h2>
      <p>ID: {props.params.id}</p>
      <Link to="/risk/report">Go to risk report</Link>
    </section>
  )
}

export default TradeDetailPage
