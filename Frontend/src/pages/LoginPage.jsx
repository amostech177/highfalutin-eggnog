import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

export default function LoginPage({ auth }) {
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const json = await auth.api(path, { method: 'POST', body: { email, password } })
      auth.login(json.token, json.user)
      nav('/')
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
      <form onSubmit={submit} className="form">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn primary" disabled={busy || !email || !password}>
          {busy ? 'Please wait…' : (mode === 'login' ? 'Login' : 'Start free trial')}
        </button>
      </form>
      <button className="linkBtn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
      <div>
        <button className="continue-google">Continue with Google</button>
      </div>
    </div>
  )
}

LoginPage.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
    login: PropTypes.func.isRequired,
  }).isRequired,
}
