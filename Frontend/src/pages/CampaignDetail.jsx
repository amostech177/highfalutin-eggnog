import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PropTypes from 'prop-types'

export default function CampaignDetail({ auth }) {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [error, setError] = useState('')
  const nav = useNavigate()

  const load = useCallback(async () => {
    try {
      const json = await auth.api(`/api/campaigns/${id}`)
      setCampaign(json.campaign)
      setRecipients(json.recipients || [])
    } catch (e) {
      setError(e.message)
    }
  }, [auth, id])

  useEffect(() => { load() }, [load])

  if (!campaign) return <div className="card">{error ? <div className="error">{error}</div> : 'Loading…'}</div>

  const openRate = campaign.deliveredCount > 0 ? ((campaign.openCount / campaign.deliveredCount) * 100).toFixed(1) : 0
  const clickRate = campaign.deliveredCount > 0 ? ((campaign.clickCount / campaign.deliveredCount) * 100).toFixed(1) : 0

  return (
    <div className="stack">
      <div className="row">
        <h2>{campaign.name}</h2>
        <button className="btn" onClick={() => nav('/campaigns')}>Back to list</button>
      </div>

      <div className="card">
        <div className="row">
          <div><strong>Status:</strong> {campaign.status}</div>
          <div><strong>Sent:</strong> {campaign.sentCount}</div>
          <div><strong>Delivered:</strong> {campaign.deliveredCount}</div>
          <div><strong>Open Rate:</strong> {openRate}%</div>
          <div><strong>Click Rate:</strong> {clickRate}%</div>
        </div>
        <div><strong>Subject:</strong> {campaign.subject}</div>
      </div>

      <div className="card">
        <h3>Recipients ({recipients.length})</h3>
        {recipients.length ? (
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr><th>Email</th><th>Name</th><th>Status</th><th>Opened</th><th>Clicked</th></tr>
            </thead>
            <tbody>
              {recipients.map(r => (
                <tr key={r._id}>
                  <td>{r.recipientEmail}</td>
                  <td>{r.recipientName}</td>
                  <td>{r.status}</td>
                  <td>{r.openedAt ? new Date(r.openedAt).toLocaleString() : '—'}</td>
                  <td>{r.clickedAt ? new Date(r.clickedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="muted">No recipients yet</div>}
      </div>
    </div>
  )
}

CampaignDetail.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
