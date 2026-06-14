import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Key, Boxes, Settings, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

function Sidebar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => { fetchMe() }, [])

  const fetchMe = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setUser(await res.json())
    } catch {}
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : '??'
  const getColor = (name) => {
    if (!name) return '#10b981'
    const c = ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return c[Math.abs(h) % c.length]
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-dot"></span>
        <span>RullRouter</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/keys" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Key size={18} /> API Keys
        </NavLink>
        <NavLink to="/models" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Boxes size={18} /> Models
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> Settings
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: getColor(user.username) }}>
              {getInitials(user.username)}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.username}</span>
              <span className="sidebar-user-role">{user.role || (user.is_admin ? 'Admin' : 'User')}</span>
            </div>
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
