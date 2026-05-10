import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

export default function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel', danger = true, confirmDisabled = false, loading = false }) {
  const modalRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '6px',
        maxWidth: '340px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>{title}</h3>
        <div style={{ color: '#555', marginBottom: '16px', fontSize: '14px', lineHeight: 1.4 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            {cancelText}
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={{
              background: danger ? '#dc2626' : '#2563eb',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              opacity: confirmDisabled ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  danger: PropTypes.bool,
  confirmDisabled: PropTypes.bool,
  loading: PropTypes.bool,
}
