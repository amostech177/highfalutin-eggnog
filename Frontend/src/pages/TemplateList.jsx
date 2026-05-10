import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

export default function TemplateList({ auth }) {
  const [templates, setTemplates] = useState([])
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
              <li key={t._id}>
                <a href="#" onClick={(e) => { e.preventDefault(); nav(`/templates/${t._id}`) }}>{t.name}</a>
                <div className="muted">{t.subject}</div>
              </li>
            ))}
          </ul>
        ) : <div className="muted">No templates. Create reusable email templates for campaigns and notifications.</div>}
      </div>
    </div>
  )
}

TemplateList.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
