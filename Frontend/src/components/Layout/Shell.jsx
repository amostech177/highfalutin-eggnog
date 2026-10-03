import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

export default function Shell({ auth, children }) {
  return (
    <div className="appShell">
      <div className="topbar">
        <Link className="brand" to="/">Covex</Link>
        <nav className="nav-links">
          {auth.user && (
            <>
              <Link to="/help">Help</Link>
            </>
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
