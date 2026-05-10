import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

export default function CampaignCreate({ auth }) {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [textBody, setTextBody] = useState('')
  const [funnelId, setFunnelId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [funnels, setFunnels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.api('/api/funnels')
      .then(r => setFunnels(r.funnels || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [auth])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const json = await auth.api('/api/campaigns', {
        method: 'POST',
        body: { name, subject, textBody, funnelId: funnelId || undefined }
      })
      nav(`/campaigns/${json.campaign._id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>New Campaign</h2>
      <form onSubmit={create} className="form">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} /></label>
        <label>Text Body (use {"{{name}}"} and {"{{email}}"} for personalization)<textarea value={textBody} onChange={e => setTextBody(e.target.value)} rows="10" placeholder="Hi {{name}},\n\nThanks for joining!\n\nBest regards,\nYour Team"></textarea></label>
        <label>Target Funnel (optional)
          <select value={funnelId} onChange={e => setFunnelId(e.target.value)} disabled={loading}>
            <option value="">All leads</option>
            {funnels.map(f => (
              <option key={f._id} value={f._id}>{f.name} ({f.slug})</option>
            ))}
          </select>
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn primary" disabled={busy || !name || !subject || !textBody}>
          {busy ? 'Creating…' : 'Create Campaign'}
        </button>
      </form>
    </div>
  )
}

CampaignCreate.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
