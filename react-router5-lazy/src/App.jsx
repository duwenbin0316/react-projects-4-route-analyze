import React, { Suspense } from 'react'
import { Link, Redirect, Route, Switch } from 'react-router-dom'
import { AuditPage, BillingPage, HomePage, ProfilePage } from './lazyPages'

function App() {
  return (
    <div style={{ padding: 28 }}>
      <h1>react-router5-lazy</h1>
      <p>Sample for React.lazy + Suspense route components.</p>

      <nav style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Link to="/home">Home</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/settings/billing">Billing</Link>
        <Link to="/settings/audit">Audit</Link>
      </nav>

      <Suspense fallback={<div>Loading route chunk...</div>}>
        <Switch>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
          <Route exact path="/home" component={HomePage} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/settings/billing" component={BillingPage} />
          <Route exact path="/settings/audit" component={AuditPage} />
        </Switch>
      </Suspense>
    </div>
  )
}

export default App
