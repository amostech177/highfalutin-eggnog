import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import RenderBlock from '../components/RenderBlock'

const API_BASE = import.meta.env.VITE_API_BASE

export default function PublicFunnel() {
  const { slug } = useParams()
  const [funnel, setFunnel] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', name: '', phone: '' })
  const [sent, setSent] = useState(false)

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/publish/funnel/${slug}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json?.message || 'Not found')
        setFunnel(json.funnel)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [slug])

  const submitLead = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/leads/capture/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || 'Failed')
      setSent(true)
    } catch (e2) {
      setError(e2.message)
    }
  }

  if (error) return <div className="card"><div className="error">{error}</div></div>
  if (!funnel) return <div className="card">Loading…</div>

  const blocks = funnel.pages?.[0]?.blocks || []
  const hasForm = blocks.some((b) => b.type === 'leadForm')

  return (
    <div className="card">
      {blocks.map((b, idx) => (
        <div key={idx} style={{ marginBottom: 12 }}>
          <RenderBlock block={b} />
        </div>
      ))}
      {hasForm ? (
        <form className="form" onSubmit={submitLead}>
          <h3>Leave your details</h3>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} inputMode="email" /></label>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></label>
          <button className="btn primary" disabled={!form.email || sent}>{sent ? 'Saved' : 'Submit'}</button>
          {error ? <div className="error">{error}</div> : null}
        </form>
      ) : null}
    </div>
  )
}