import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import Modal from '../components/Modal'

export default function Dashboard({ auth }) {
  const nav = useNavigate()
  const [funnels, setFunnels] = useState([])
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteModal, setDeleteModal] = useState({ open: false, funnelId: null, funnelName: '', loading: false })

  const deleteFunnel = async (id, name) => {
    setDeleteModal({ open: true, funnelId: id, funnelName: name, loading: false })
    setDeleteError('')
  }

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await auth.api(`/api/funnels/${deleteModal.funnelId}`, { method: 'DELETE' })
      setFunnels(funnels.filter(f => f._id !== deleteModal.funnelId))
      setDeleteModal({ open: false, funnelId: null, funnelName: '', loading: false })
    } catch (e) {
      setDeleteError(e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    if (!auth.token) return
    ; (async () => {
      try {
        const [f, b] = await Promise.all([
          auth.api('/api/funnels'),
          auth.api('/api/billing/me'),
        ])
        setFunnels(f.funnels || [])
        setMe(b.user || null)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [auth])

  if (!auth.token) {
    return (
      <div className="card">
        <h2>Welcome</h2>
        <p>Ready to accelerate your sales online with a free trial, then you pay as you go.</p>
        <Link className="btn primary" to="/login">Get started</Link>
      </div>
    )
  }

return (
    <div className="stack">
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        <h2>Billing</h2>
        <div className="row wrap">
          <div><strong>Wallet</strong>: {me?.wallet?.balance ?? 0} credits</div>
          <div><strong>{me?.trial?.endsAt && +new Date(me.trial.endsAt) <= Date.now() ? 'Trial ended on' : 'Trial ends'}</strong>: {me?.trial?.endsAt ? new Date(me.trial.endsAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
        </div>
        <button className="btn" onClick={() => nav('/topup')}>Top up with M-Pesa</button>
      </div>

      <div className="card">
        <div className="row">
          <h2>Your funnels</h2>
          <button className="btn primary" onClick={() => nav('/new')}>New</button>
        </div>
        {deleteError ? <div className="error">{deleteError}</div> : null}
        {funnels.length ? (
          <div className="list">
            {funnels.map((f) => (
               <div className="listItem" key={f._id}>
                 <div>
                   <div className="title">{f.name}</div>
                   <div className="muted">/{f.slug} {f.published ? '• published' : ''}</div>
                 </div>
                 <div style={{ display: 'flex', gap: 8 }}>
                   <button className="btn" onClick={() => nav(`/edit/${f._id}`)}>Edit</button>
                   <button className="btn" style={{ color: 'red', borderColor: 'red' }} onClick={() => deleteFunnel(f._id, f.name)}>Delete</button>
                 </div>
               </div>
            ))}
          </div>
        ) : (
          <div className="muted">No funnels yet.</div>
        )}
      </div>

      <div className="card">
        <h2>Email Marketing</h2>
        <div className="row wrap">
          <button className="btn" onClick={() => nav('/campaigns')}>All Campaigns</button>
          <button className="btn" onClick={() => nav('/templates')}>Email Templates</button>
        </div>
      </div>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => !deleteModal.loading && setDeleteModal({ open: false, funnelId: null, funnelName: '', loading: false })}
        onConfirm={confirmDelete}
        title="Delete Funnel"
        message={
          <>
            <p>Are you sure you want to delete <strong>&quot;{deleteModal.funnelName}&quot;</strong>?</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              This will permanently delete:
            </p>
            <ul style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 20px' }}>
              <li>All leads captured from this funnel</li>
              <li>All campaigns associated with this funnel</li>
              <li>The funnel itself</li>
            </ul>
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        confirmDisabled={deleteModal.loading}
        loading={deleteModal.loading}
      />
    </div>
  )
}

Dashboard.propTypes = {
  auth: PropTypes.shape({
    token: PropTypes.string,
    user: PropTypes.object,
    api: PropTypes.func.isRequired,
  }).isRequired,
}
