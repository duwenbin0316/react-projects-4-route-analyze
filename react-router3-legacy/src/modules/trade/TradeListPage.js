import React from 'react'
import PropTypes from 'prop-types'

function TradeListPage(props, context) {
  const jumpWithTemplate = () => {
    const selectedId = '3003'
    context.router.push(`/trade/detail/${selectedId}`)
  }

  return (
    <section>
      <h2>Trade List</h2>
      <button onClick={jumpWithTemplate}>Template string to detail</button>
    </section>
  )
}

TradeListPage.contextTypes = {
  router: PropTypes.object,
}

export default TradeListPage
