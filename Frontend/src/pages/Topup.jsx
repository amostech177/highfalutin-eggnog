import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

const PACKAGES = [
  { kes: 15, credits: 1 },
  { kes: 30, credits: 2 },
  { kes: 45, credits: 3 },
  { kes: 75, credits: 5 },
  { kes: 150, credits: 10 },
]

function toNearest15(v) {
  const n = Math.max(0, Math.floor(Number(v) || 0))
  return Math.round(n / 15) * 15
}

export default function Topup({ auth }) {
  const [phone, setPhone] = useState('')
  const [amountKes, setAmountKes] = useState('75')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const rawKes = Number(amountKes) || 0
  const snappedKes = toNearest15(rawKes)
  const credits = Math.max(0, Math.floor(snappedKes / 15))

  useEffect(() => {
    if (amountKes === String(snappedKes)) return
    setAmountKes(String(snappedKes))
  }, [snappedKes])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      const json = await auth.api('/api/billing/daraja/topup', { method: 'POST', body: { phone, amountKes: snappedKes } })
      setMsg(json.customerMessage || `STK sent. CheckoutRequestID: ${json.checkoutRequestId}`)
    } catch (e2) {
      const errorMsg = e2.details?.errorMessage || e2.message || 'Unknown error'
      setErr(errorMsg)
    }
  }

  return (
    <div className="card">
      <h2>Top up (M-Pesa)</h2>
      <p className="muted" style={{ marginBottom: 16 }}>1 credit = KSh 15. Type any amount and it will snap to the nearest multiple of 15:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {PACKAGES.map(({ kes, credits }) => (
          <button
            key={kes}
            type="button"
            className={`btn ${snappedKes === kes ? 'primary' : ''}`}
            style={{ flex: '1 1 auto' }}
            onClick={() => setAmountKes(String(kes))}
          >
            {credits} credit{credits !== 1 ? 's' : ''} &mdash; KSh {kes}
          </button>
        ))}
      </div>
      <form className="form" onSubmit={submit}>
        <label>Phone (2547...)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="2547XXXXXXXX" />
        <label style={{ fontWeight: 'bold' }}>Amount (KES) &mdash; snaps to nearest KSh 15</label>
        <input
          value={amountKes}
          onChange={(e) => setAmountKes(e.target.value)}
          inputMode="numeric"
          placeholder="e.g. 20"
        />
<div className="muted" style={{ margin: '8px 0', fontSize: '14px' }}>
           You&apos;ll receive: <strong style={{ color: '#000' }}>{credits} credit{credits !== 1 ? 's' : ''}</strong> &mdash; worth {credits} emails / {credits} leads / {credits} funnels
         </div>
         <button className="btn primary" disabled={!phone || !credits}>Send STK</button>
       </form>
      {msg ? <div className="success" style={{ marginTop: 12 }}>{msg}</div> : null}
      {err ? <div className="error" style={{ marginTop: 12 }}>{err}</div> : null}
    </div>
  )
}

Topup.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
