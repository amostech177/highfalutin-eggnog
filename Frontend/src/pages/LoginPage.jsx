import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { app } from '../firebase'
import { trackEvent } from '../analytics'

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
      if (mode === 'register') {
        trackEvent('signup_completed', { method: 'email' })
      }
      nav('/')
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setBusy(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const firebaseAuth = getAuth(app)
      const result = await signInWithPopup(firebaseAuth, provider)

      console.log('Google User:', result.user)

      const { uid, email, displayName, photoURL } = result.user

      // Send to backend to create/get user and get JWT
      const response = await auth.api('/api/auth/google', {
        method: 'POST',
        body: { firebaseUid: uid, email, displayName, photoURL }
      })

      // Login with backend token
      auth.login(response.token, response.user)
      nav('/')
    } catch (err) {
      console.error('Google login error:', err)
      setError(err.message || 'Google login failed')
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
        <button className="btn continue-google"
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}>
          Continue with Google
        </button>
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
