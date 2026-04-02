import React from 'react'
import { browserHistory } from 'react-router'

function LoginPage() {
  const login = () => {
    window.sessionStorage.setItem('legacy-token', 'ok')
    browserHistory.replace('/dashboard')
  }

  return (
    <section>
      <h2>Login</h2>
      <button onClick={login}>Login and replace to dashboard</button>
    </section>
  )
}

export default LoginPage
