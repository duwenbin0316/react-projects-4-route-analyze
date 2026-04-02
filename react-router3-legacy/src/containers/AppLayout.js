import React from 'react'
import { Link } from 'react-router'
import PropTypes from 'prop-types'

function AppLayout(props) {
  return (
    <div>
      <header>
        <h1>react-router3-legacy</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          {' | '}
          <Link to="/trade/list">Trade List</Link>
          {' | '}
          <Link to="/risk/report">Risk Report</Link>
        </nav>
      </header>
      <main>{props.children}</main>
    </div>
  )
}

AppLayout.propTypes = {
  children: PropTypes.node,
}

export default AppLayout
