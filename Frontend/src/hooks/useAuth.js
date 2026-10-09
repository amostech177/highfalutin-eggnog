import { useEffect, useMemo, useState } from 'react'
import posthog, { posthogEnabled } from '../posthog'

const API_BASE = import.meta.env.VITE_API_BASE

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (!posthogEnabled) return

    if (user?.id) {
      const properties = { email: user.email }
      if (user.displayName) {
        properties.name = user.displayName
      }
      posthog.identify(user.id, properties)
    } else {
      posthog.reset()
    }
  }, [user])

  const login = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (e) {
      console.warn('Logout request failed:', e)
    }
    setToken('')
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const api = useMemo(() => {
    return async (path, { method = 'GET', body } = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw { message: json?.message || 'Request failed', details: json?.details }
      return json
    }
  }, [token])

  return { token, user, api, login, logout }
}
