
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function NavIcon({ type }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </>
    ),
    workspaces: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v6" />
      </>
    ),
    properties: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    campaigns: (
      <>
        <path d="M3 11v2a2 2 0 0 0 2 2h2l9 5V4l-9 5H5a2 2 0 0 0-2 2Z" />
        <path d="m7 15 2 6" />
        <path d="M20 9a5 5 0 0 1 0 6" />
      </>
    ),
    prospects: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a6 6 0 0 1 12 0v1Z" />
        <path d="M16 11a3 3 0 1 0 0-6" />
        <path d="M18 14a5 5 0 0 1 3 5v1h-3" />
      </>
    ),
    backlinks: (
      <>
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.72-1.72" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/workspaces', label: 'Workspaces', icon: 'workspaces' },
    { to: '/properties', label: 'Properties', icon: 'properties' },
    { to: '/campaigns', label: 'SEO Campaigns', icon: 'campaigns' },
    { to: '/prospects', label: 'Prospects', icon: 'prospects' },
    { to: '/backlinks', label: 'Backlinks', icon: 'backlinks' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">P</div>
        <h2>PropertyLink AI</h2>
        <span>Intelligent SEO Platform</span>
      </div>

      <div className="nav-section-label">Workspace</div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/dashboard'}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">
              <NavIcon type={link.icon} />
            </span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-info">
          <strong>{user?.name || 'User'}</strong>
          <span>{user?.role || 'Workspace member'}</span>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
