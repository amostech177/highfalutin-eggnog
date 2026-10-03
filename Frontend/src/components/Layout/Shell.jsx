import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

export default function Shell({ auth, children }) {
  return (
    <div className="appShell">
      <div className="topbar">
        <Link className="brand" to="/">
          <img src="/images/Covex.png" alt="Covex" className="logo-icon" />
        </Link>
        <nav className="nav-links">
          {auth.user && (
            <Link to="/help" className="nav-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Help
            </Link>
          )}
        </nav>
        <div className="spacer" />
        {auth.user ? (
          <button className="btn" onClick={auth.logout}>Logout</button>
        ) : (
          <Link className="btn" to="/login">Login</Link>
        )}
      </div>
      <div className="content">{children}</div>
    </div>
  )
}

Shell.propTypes = {
  auth: PropTypes.shape({
    user: PropTypes.object,
    logout: PropTypes.func,
  }).isRequired,
  children: PropTypes.node.isRequired,
}
