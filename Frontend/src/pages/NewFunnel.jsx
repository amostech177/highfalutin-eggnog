import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { trackEvent } from '../analytics'

export default function NewFunnel({ auth }) {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const json = await auth.api('/api/funnels', { method: 'POST', body: { name, slug } })
      trackEvent('project_created')
      nav(`/edit/${json.funnel._id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>New funnel</h2>
      <form onSubmit={create} className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Slug (lowercase, hyphens)
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-offer" />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn primary" disabled={busy || !name || !slug}>
          {busy ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  )
}

NewFunnel.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
