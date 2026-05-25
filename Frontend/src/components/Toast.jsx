import { useEffect } from 'react'
import PropTypes from 'prop-types'

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      background: '#10b981',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1100,
      fontSize: '14px',
      fontWeight: 500,
      maxWidth: '320px',
    }}>
      {message}
    </div>
  )
}

Toast.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
}