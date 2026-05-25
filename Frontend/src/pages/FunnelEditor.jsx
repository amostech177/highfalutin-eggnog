import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PropTypes from 'prop-types'
import RenderBlock from '../components/RenderBlock'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const DEFAULT_NOTIFICATION_TEMPLATE = {
  name: 'New Lead Notification',
  subject: 'New Lead: {{lead.firstName}} {{lead.lastName}}',
  htmlBody: 'A new lead has been captured:<br><br>Name: {{lead.firstName}} {{lead.lastName}}<br>Email: {{lead.email}}<br><br><a href="{{appUrl}}/leads">View in dashboard</a>',
  textBody: 'A new lead has been captured:\n\nName: {{lead.firstName}} {{lead.lastName}}\nEmail: {{lead.email}}\n\nView in dashboard: {{appUrl}}/leads'
}

const DEFAULT_AUTORESPONDER_TEMPLATE = {
  name: 'Thank You Autoresponder',
  subject: 'Thank you for your interest!',
  htmlBody: 'Hi {{lead.firstName}},<br><br>Thank you for your interest! We\'ll be in touch soon.<br><br>Best regards,<br>The Team',
  textBody: 'Hi {{lead.firstName}},\n\nThank you for your interest! We\'ll be in touch soon.\n\nBest regards,\nThe Team'
}

function defaultProps(type) {
  if (type === 'heading') return { text: 'Your big promise' }
  if (type === 'text') return { text: 'A short description that sells the offer.' }
  if (type === 'button') return { text: 'Get started', href: '' }
  if (type === 'leadForm') return { buttonText: 'Notify me' }
  return {}
}

export default function FunnelEditor({ auth }) {
  const nav = useNavigate()
  const { id } = useParams()
  const [funnel, setFunnel] = useState(null)
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [f, t] = await Promise.all([
        auth.api(`/api/funnels/${id}`),
        auth.api('/api/templates'),
      ])
      setFunnel(f.funnel)
      setTemplates(t.templates || [])
    } catch (e) {
      setError(e.message)
    }
  }, [auth, id])

  useEffect(() => { load() }, [load])

  const updateFunnel = (updates) => {
    setFunnel(f => ({ ...f, ...updates }))
    setSaved(false)
  }

   const updateBlock = (idx, nextProps) => {
     setFunnel((f) => {
       const pages = [...f.pages]
       const blocks = [...pages[0].blocks]
       blocks[idx] = { ...blocks[idx], props: { ...blocks[idx].props, ...nextProps } }
       pages[0] = { ...pages[0], blocks }
       return { ...f, pages }
     })
     setSaved(false)
   }
   
    // Auto-select appropriate template when enabling a checkbox
  const handleNotificationChange = async (e) => {
    const checked = e.target.checked
    updateFunnel({ ownerNotificationEnabled: checked })
    
    if (checked && funnel && !funnel.ownerNotificationTemplateId) {
      const defaultTemplate = templates.find(t => t.name === 'New Lead Notification')
      if (defaultTemplate) {
        updateFunnel({ ownerNotificationTemplateId: defaultTemplate._id })
      } else {
        await createTemplate('notification')
      }
    }
  }
  
    const handleAutoresponderChange = async (e) => {
    const checked = e.target.checked
    updateFunnel({ autoresponderEnabled: checked })
    
    if (checked && funnel && !funnel.autoresponderTemplateId) {
      const defaultTemplate = templates.find(t => t.name === 'Thank You Autoresponder')
      if (defaultTemplate) {
        updateFunnel({ autoresponderTemplateId: defaultTemplate._id })
      } else {
        await createTemplate('autoresponder')
      }
    }
  }

  const createTemplate = async (type) => {
    setCreatingTemplate(true)
    setError('')
    try {
      const templateData = type === 'notification' ? DEFAULT_NOTIFICATION_TEMPLATE : DEFAULT_AUTORESPONDER_TEMPLATE
      const newTemplate = await auth.api('/api/templates', {
        method: 'POST',
        body: templateData
      })
      setTemplates(t => [...t, newTemplate])
      if (type === 'notification') {
        updateFunnel({ ownerNotificationTemplateId: newTemplate._id })
      } else {
        updateFunnel({ autoresponderTemplateId: newTemplate._id })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setCreatingTemplate(false)
    }
  }

const addBlock = (type) => {
    setFunnel((f) => {
      const pages = [...f.pages]
      const blocks = pages[0].blocks
      const typeExists = blocks.some(b => b.type === type)
      if (typeExists) return f
      const nextBlocks = [...blocks, { type, props: defaultProps(type) }]
      pages[0] = { ...pages[0], blocks: nextBlocks }
      return { ...f, pages }
    })
    setSaved(false)
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const json = await auth.api(`/api/funnels/${id}`, {
        method: 'PUT',
        body: {
          pages: funnel.pages,
          ownerNotificationEnabled: funnel.ownerNotificationEnabled,
          ownerNotificationTemplateId: funnel.ownerNotificationTemplateId || null,
          autoresponderEnabled: funnel.autoresponderEnabled,
          autoresponderTemplateId: funnel.autoresponderTemplateId || null,
        }
      })
      setFunnel(json.funnel)
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const publish = async () => {
    setBusy(true)
    setError('')
    try {
      const json = await auth.api(`/api/funnels/${id}/publish`, { method: 'POST' })
      setFunnel(json.funnel)
      await navigator.clipboard.writeText(json.publicUrl)
      setToast(`Published! Copied to clipboard: ${json.publicUrl}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await auth.api(`/api/funnels/${id}`, { method: 'DELETE' })
      nav('/')
    } catch (e) {
      setError(e.message)
      setShowDeleteModal(false)
      setDeleting(false)
    }
  }

  if (!funnel) return <div className="card">{error ? <div className="error">{error}</div> : 'Loading…'}</div>

  const blocks = funnel.pages?.[0]?.blocks || []

  return (
    <div className="stack">
      <div className="card">
        <div className="row">
          <h2>{funnel.name}</h2>
          <div className="row">
<button className="btn" onClick={save} disabled={busy || creatingTemplate}>{busy ? 'Saving…' : saved ? 'Saved' : 'Save'}</button>
             <button className="btn primary" onClick={publish} disabled={busy || creatingTemplate}>Publish</button>
             <button className="btn" style={{ color: 'red', borderColor: 'red' }} onClick={() => setShowDeleteModal(true)} disabled={busy || creatingTemplate}>Delete</button>
          </div>
        </div>
        <div className="muted">Slug: /{funnel.slug}</div>
      </div>

      <div className="card">
        <h3>Email Notifications</h3>
        <div className="form">
           <label>
             <input
               type="checkbox"
               checked={funnel.ownerNotificationEnabled || false}
               onChange={handleNotificationChange}
               disabled={creatingTemplate}
             />
             Notify me when a lead is captured
           </label>
            {funnel.ownerNotificationEnabled && (
              <div style={{ marginLeft: 24, marginTop: 8 }}>
                <label>Notification template
                   <select
                     value={funnel.ownerNotificationTemplateId || ''}
                     onChange={e => updateFunnel({ ownerNotificationTemplateId: e.target.value || null })}
                     disabled={creatingTemplate}
                   >
                     <option value="">(no email — just capture the lead)</option>
                     {templates.filter(t => t.name !== 'Thank You Autoresponder' && t.name !== 'njiniun').map(t => (
                       <option key={t._id} value={t._id}>{t.name}</option>
                     ))}
                   </select>
                </label>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  [Info] Personalization variables available: {'{{lead}}'}, {'{{funnel}}'}, {'{{funnelUrl}}'}
                </div>
                {funnel.ownerNotificationTemplateId && (() => {
                  const t = templates.find(t => t._id === funnel.ownerNotificationTemplateId)
                  return t ? (
                     <>
                       <span className="templateBadge">{t.name}</span>
                       <button className="linkBtn" onClick={() => nav(`/templates/${t._id}`)} disabled={creatingTemplate}>Edit template</button>
                     </>
                  ) : null
                })()}
              </div>
            )}

           <label style={{ marginTop: 12 }}>
             <input
               type="checkbox"
               checked={funnel.autoresponderEnabled || false}
               onChange={handleAutoresponderChange}
               disabled={creatingTemplate}
             />
             Send autoresponder to lead
           </label>
            {funnel.autoresponderEnabled && (
              <div style={{ marginLeft: 24, marginTop: 8 }}>
                <label>Autoresponder template
                   <select
                     value={funnel.autoresponderTemplateId || ''}
                     onChange={e => updateFunnel({ autoresponderTemplateId: e.target.value || null })}
                     disabled={creatingTemplate}
                   >
                     {templates.filter(t => t.name !== 'New Lead Notification' && t.name !== 'njiniun').map(t => (
                       <option key={t._id} value={t._id}>{t.name}</option>
                     ))}
                   </select>
                </label>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  💡 Personalization variables available: {'{{name}}'}, {'{{funnel}}'}, {'{{leadEmail}}'}, {'{{leadId}}'}, {'{{currentYear}}'}, {'{{unsubscribe_url}}'}
                </div>
                {funnel.autoresponderTemplateId && (() => {
                  const t = templates.find(t => t._id === funnel.autoresponderTemplateId)
                  return t ? (
                     <>
                       <span className="templateBadge">{t.name}</span>
                       <button className="linkBtn" onClick={() => nav(`/templates/${t._id}`)} disabled={creatingTemplate}>Edit template</button>
                     </>
                  ) : null
                })()}
              </div>
            )}
        </div>
      </div>

      <div className="card">
        <h3>Add section</h3>
        <div className="row wrap">
          <button className="btn" onClick={() => addBlock('heading')}>Heading</button>
          <button className="btn" onClick={() => addBlock('text')}>Text</button>
          <button className="btn" onClick={() => addBlock('button')}>Button</button>
          <button className="btn" onClick={() => addBlock('leadForm')}>Lead form</button>
        </div>
      </div>

      <div className="card">
        <h3>Preview</h3>
        <div className="preview">
          {blocks.map((b, idx) => (
            <div className="block" key={idx}>
              <RenderBlock block={b} />
              <div className="editor">
                {b.type === 'heading' ? (
                  <input value={b.props.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} placeholder="Heading text" />
                ) : null}
                {b.type === 'text' ? (
                  <textarea value={b.props.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} placeholder="Text" />
                ) : null}
                {b.type === 'button' ? (
                  <>
                    <input value={b.props.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} placeholder="Button text" />
                    <input value={b.props.href || ''} onChange={(e) => updateBlock(idx, { href: e.target.value })} placeholder="https://..." inputMode="url" />
                  </>
                ) : null}
                {b.type === 'leadForm' ? (
                  <input value={b.props.buttonText || ''} onChange={(e) => updateBlock(idx, { buttonText: e.target.value })} placeholder="Submit button text" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {error ? <div className="error">{error}</div> : null}
      </div>

<Modal
         isOpen={showDeleteModal}
         onClose={() => !deleting && setShowDeleteModal(false)}
         onConfirm={handleDelete}
         title="Delete Funnel"
         message={
           <>
             <p>Are you sure you want to delete <strong>&quot;{funnel?.name}&quot;</strong>?</p>
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
         confirmDisabled={deleting}
         loading={deleting}
       />
       <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}

FunnelEditor.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
