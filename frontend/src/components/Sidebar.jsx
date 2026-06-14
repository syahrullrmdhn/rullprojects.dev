import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Key, Boxes, Users, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

function Sidebar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchMe()
  }, [])

  const fetchMe = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch {}
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : '??'

  const getAvatarColor = (name) => {
    if (!name) return '#10b981'
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-dot"></span>
        <span className="sidebar-logo-text">RullRouter</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink to="/keys" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Key size={18} />
          API Keys
        </NavLink>
        <NavLink to="/models" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Boxes size={18} />
          Models
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            Users
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-profile">
            <div className="sidebar-avatar" style={{ background: getAvatarColor(user.username) }}>
              {getInitials(user.username)}
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user.username}</span>
              <span className="sidebar-profile-role">{user.role || (user.is_admin ? 'admin' : 'user')}</span>
            </div>
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
