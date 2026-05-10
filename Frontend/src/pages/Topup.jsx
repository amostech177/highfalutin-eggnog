import { useState } from 'react'
import PropTypes from 'prop-types'

export default function Topup({ auth }) {
  const [phone, setPhone] = useState('')
  const [amountKes, setAmountKes] = useState(50)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      const json = await auth.api('/api/billing/daraja/topup', { method: 'POST', body: { phone, amountKes: Number(amountKes) } })
      setMsg(json.customerMessage || `STK sent. CheckoutRequestID: ${json.checkoutRequestId}`)
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div className="card">
      <h2>Top up (M-Pesa)</h2>
      <form className="form" onSubmit={submit}>
        <label>Phone (2547...)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="2547XXXXXXXX" />
        <label>Amount (KES)</label>
        <input value={amountKes} onChange={(e) => setAmountKes(e.target.value)} inputMode="numeric" />
        <button className="btn primary" disabled={!phone || !amountKes}>Send STK</button>
      </form>
      {msg ? <div className="success">{msg}</div> : null}
      {err ? <div className="error">{err}</div> : null}
    </div>
  )
}

Topup.propTypes = {
  auth: PropTypes.shape({
    api: PropTypes.func.isRequired,
  }).isRequired,
}
