import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import Modal from '../components/Modal'

export default function CampaignList({ auth }) {
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState('')
  const nav = useNavigate()
  const [cancelModal, setCancelModal] = useState({ open: false, campaignId: null, loading: false })
  const [sendModal, setSendModal] = useState({ open: false, campaignId: null, loading: false })
  const [deleteModal, setDeleteModal] = useState({ open: false, campaignId: null, loading: false })

  const load = useCallback(async () => {
    try {
      const json = await auth.api('/api/campaigns')
      setCampaigns(json.campaigns || [])
    } catch (e) {
      setError(e.message)
    }
  }, [auth])

  useEffect(() => {
    load()
  }, [load])

  const openSendModal = (id) => {
    setSendModal({ open: true, campaignId: id, loading: false })
  }

  const confirmSend = async () => {
    setSendModal(prev => ({ ...prev, loading: true }))
    try {
      await auth.api(`/api/campaigns/${sendModal.campaignId}/send`, { method: 'POST' })
      setSendModal({ open: false, campaignId: null, loading: false })
      load()
    } catch (e) {
      setSendModal(prev => ({ ...prev, loading: false }))
      alert(e.message)
    }
  }

  const openCancelModal = (id) => {
    setCancelModal({ open: true, campaignId: id, loading: false })
  }

  const confirmCancel = async () => {
    setCancelModal(prev => ({ ...prev, loading: true }))
    try {
      await auth.api(`/api/campaigns/${cancelModal.campaignId}/cancel`, { method: 'POST' })
      setCancelModal({ open: false, campaignId: null, loading: false })
      load()
    } catch (e) {
      setCancelModal(prev => ({ ...prev, loading: false }))
      alert(e.message)
    }
  }

  const openDeleteModal = (id) => {
    setDeleteModal({ open: true, campaignId: id, loading: false })
  }

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await auth.api(`/api/campaigns/${deleteModal.campaignId}`, { method: 'DELETE' })
      setDeleteModal({ open: false, campaignId: null, loading: false })
      load()
    } catch (e) {
      setDeleteModal(prev => ({ ...prev, loading: false }))
      alert(e.message)
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <h2>Campaigns</h2>
        <button className="btn primary" onClick={() => nav('/campaigns/new')}>New Campaign</button>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        {campaigns.length ? (
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Delivered</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c._id}>
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); nav(`/campaigns/${c._id}`) }}>{c.name}</a>
                  </td>
                  <td>{c.status}</td>
                  <td>{c.sentCount}</td>
                  <td>{c.deliveredCount}</td>
                  <td>{c.openCount}</td>
                  <td>{c.clickCount}</td>
                  <td>
                    {c.status === 'draft' || c.status === 'scheduled' ? (
                      <>
                        <button className="btn" onClick={() => openSendModal(c._id)}>Send</button>
                        <button className="btn" onClick={() => openCancelModal(c._id)}>Cancel</button>
                      </>
                    ) : null}
                    {c.status === 'cancelled' ? (
                      <button className="btn danger" onClick={() => openDeleteModal(c._id)}>Delete</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="muted">No campaigns. <button className="linkBtn" onClick={() => nav('/campaigns/new')}>Create your first</button></div>
        )}
      </div>

      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, campaignId: null, loading: false })}
        onConfirm={confirmCancel}
        title="Cancel Campaign"
        message="Are you sure you want to cancel this campaign?"
        confirmText="Cancel"
        cancelText="Cancel"
        danger={true}
        confirmDisabled={cancelModal.loading}
        loading={cancelModal.loading}
      />

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, campaignId: null, loading: false })}
        onConfirm={confirmDelete}
        title="Delete Campaign"
        message="Are you sure you want to delete this cancelled campaign? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        confirmDisabled={deleteModal.loading}
        loading={deleteModal.loading}
      />

      <Modal
        isOpen={sendModal.open}
        onClose={() => setSendModal({ open: false, campaignId: null, loading: false })}
        onConfirm={confirmSend}
        title="Send Campaign"
        message="Are you sure you want to send this campaign? This cannot be undone."
        confirmText="Send"
        cancelText="Cancel"
        danger={true}
        confirmDisabled={sendModal.loading}
        loading={sendModal.loading}
      />
    </div>
  )
}

CampaignList.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
