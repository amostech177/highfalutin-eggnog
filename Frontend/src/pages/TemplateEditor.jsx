import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PropTypes from 'prop-types'
import Modal from '../components/Modal'

export default function TemplateEditor({ auth }) {
  const { id } = useParams()
  const isEdit = !!id
  const [name, setName] = useState('')
  const [type, setType] = useState('notification')
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [textBody, setTextBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  const generateHtmlFromText = (text) => {
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .content { font-size: 16px; line-height: 1.6; color: #333333; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">{{content}}</div>
  </div>
</body>
</html>`.replace(/\{\{content\}\}/g, escapedText)
  }

  const handleTextChange = (e) => {
    const newText = e.target.value
    setTextBody(newText)
    setHtmlBody(generateHtmlFromText(newText))
  }

  useEffect(() => {
    const loadTemplate = async () => {
      if (!isEdit) return
      try {
        const json = await auth.api(`/api/templates/${id}`)
        const t = json.template
        setName(t.name)
        setType(t.type || 'notification')
        setSubject(t.subject)
        setHtmlBody(t.htmlBody)
        setTextBody(t.textBody || '')
      } catch (e) {
        setError(e.message)
      }
    }
    loadTemplate()
  }, [auth, id, isEdit])

  useEffect(() => {
    if (!isEdit) {
      setHtmlBody(generateHtmlFromText(''))
    }
  }, [isEdit])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const method = isEdit ? 'PUT' : 'POST'
      const path = isEdit ? `/api/templates/${id}` : '/api/templates'
      await auth.api(path, { method, body: { name, type, subject, htmlBody, textBody } })
      nav('/templates')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await auth.api(`/api/templates/${id}`, { method: 'DELETE' })
      nav('/templates')
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="card">
      <h2>{isEdit ? 'Edit Template' : 'New Template'}</h2>
      <form onSubmit={save} className="form">
        <label>
          Name
          <input value={name} onChange={e => setName(e.target.value)} required />
        </label>
        <label>
          Type
          <select value={type} onChange={e => setType(e.target.value)} disabled={isEdit}>
            <option value="notification">Notification</option>
            <option value="autoresponder">Autoresponder</option>
          </select>
        </label>
        <label>
          Subject
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (supports {{name}}, {{email}} variables)" />
        </label>
        <label>
          Message Text
          <textarea value={textBody} onChange={handleTextChange} rows="12" placeholder="Write your message here. HTML will be auto-generated." />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn primary" disabled={busy || deleting || !name || !subject || !textBody}>
            {busy ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
          </button>
          {isEdit && (
            <button
              type="button"
              className="btn"
              onClick={() => setShowDeleteModal(true)}
              disabled={busy || deleting}
              style={{ color: 'red', borderColor: 'red' }}
            >
              Delete
            </button>
          )}
        </div>
      </form>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={
          <>
            <p>Are you sure you want to delete <strong>&quot;{name}&quot;</strong>?</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              This will permanently delete this {type} template.
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

TemplateEditor.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}