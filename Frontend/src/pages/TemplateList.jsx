import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import Modal from '../components/Modal'

export default function TemplateList({ auth }) {
  const [templates, setTemplates] = useState([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const nav = useNavigate()

  const load = useCallback(async () => {
    try {
      const json = await auth.api('/api/templates')
      setTemplates(json.templates || [])
    } catch (e) {
      alert(e.message)
    }
  }, [auth])

  useEffect(() => {
    load()
  }, [load])

  const handleDeleteClick = (template) => {
    setTemplateToDelete(template)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!templateToDelete) return
    setDeleting(true)
    try {
      await auth.api(`/api/templates/${templateToDelete._id}`, { method: 'DELETE' })
      setTemplates(t => t.filter(tpl => tpl._id !== templateToDelete._id))
      setShowDeleteModal(false)
      setTemplateToDelete(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <h2>Email Templates</h2>
        <button className="btn primary" onClick={() => nav('/templates/new')}>New Template</button>
      </div>
      <div className="card">
        {templates.length ? (
          <ul>
            {templates.map(t => (
              <li key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <a href="#" onClick={(e) => { e.preventDefault(); nav(`/templates/${t._id}`) }}>{t.name}</a>
                  <div className="muted">{t.subject} <span style={{ marginLeft: 8, color: '#888' }}>({t.type})</span></div>
                </div>
                <button
                  className="linkBtn"
                  onClick={() => handleDeleteClick(t)}
                  style={{ color: 'red', marginLeft: 12 }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : <div className="muted">No templates. Create reusable email templates for campaigns and notifications.</div>}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={
          <>
            <p>Are you sure you want to delete <strong>&quot;{templateToDelete?.name}&quot;</strong>?</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              This will permanently delete this {templateToDelete?.type} template.
            </p>
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        confirmDisabled={deleting}
        loading={deleting}
      />
    </div>
  )
}

TemplateList.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}