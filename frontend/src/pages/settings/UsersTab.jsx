import { useState, useEffect } from 'react'
import { UserPlus, Trash2, ShieldCheck, Shield, User, Eye, ArrowLeft, X } from 'lucide-react'

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers })
      if (res.ok) { const d = await res.json(); setUsers(d.users || []) }
    } catch {} finally { setLoading(false) }
  }

  const createUser = async (e) => {
    e.preventDefault(); setError('')
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers, body: JSON.stringify({ username: newUser.username, password: newUser.password }) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || 'Failed'); return }
      const data = await res.json()
      if (newUser.role !== 'user' && data.user) {
        await fetch(`/api/users/${data.user.id}/role`, { method: 'PUT', headers, body: JSON.stringify({ role: newUser.role, is_admin: newUser.role === 'admin' }) })
      }
      setShowCreate(false); setNewUser({ username: '', password: '', role: 'user' }); fetchUsers()
    } catch { setError('Failed to create user') }
  }

  const updateRole = async (userId, role) => {
    await fetch(`/api/users/${userId}/role`, { method: 'PUT', headers, body: JSON.stringify({ role, is_admin: role === 'admin' }) })
    fetchUsers()
    if (selectedUser) setSelectedUser({ ...selectedUser, role, is_admin: role === 'admin' })
  }

  const deleteUser = async (id) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE', headers })
    setSelectedUser(null); setConfirmDelete(false); fetchUsers()
  }

  const getInitials = (n) => n.slice(0, 2).toUpperCase()
  const getColor = (n) => {
    const c = ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
    return c[Math.abs(h) % c.length]
  }

  const roles = [
    { id: 'admin', label: 'Admin', desc: 'Full access to all settings', icon: <ShieldCheck size={16} />, color: '#059669', bg: '#ecfdf5' },
    { id: 'editor', label: 'Editor', desc: 'Manage own keys and view usage', icon: <Shield size={16} />, color: '#4f46e5', bg: '#eef2ff' },
    { id: 'user', label: 'User', desc: 'Use keys, view own data', icon: <User size={16} />, color: '#374151', bg: '#f3f4f6' },
    { id: 'viewer', label: 'Viewer', desc: 'Read-only access', icon: <Eye size={16} />, color: '#92400e', bg: '#fefce8' },
  ]

  // Detail view
  if (selectedUser) {
    const userRole = roles.find(r => r.id === (selectedUser.role || 'user')) || roles[2]
    return (
      <div>
        <button className="back-btn" onClick={() => { setSelectedUser(null); setConfirmDelete(false) }}>
          <ArrowLeft size={16} /> Back to users
        </button>

        <div className="user-detail-header">
          <div className="user-detail-avatar" style={{ background: getColor(selectedUser.username) }}>
            {getInitials(selectedUser.username)}
          </div>
          <div>
            <h2>{selectedUser.username}</h2>
            <p>Joined {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
          </div>
        </div>

        <div className="settings-section">
          <h3>Role & Permissions</h3>
          <p className="settings-section-desc">Select which role this user should have</p>
          <div className="role-picker">
            {roles.map(r => (
              <button key={r.id} className={`role-picker-item ${(selectedUser.role || 'user') === r.id ? 'role-picker-active' : ''}`} onClick={() => updateRole(selectedUser.id, r.id)}>
                <div className="role-picker-icon" style={{ background: r.bg, color: r.color }}>{r.icon}</div>
                <div className="role-picker-info">
                  <span className="role-picker-label">{r.label}</span>
                  <span className="role-picker-desc">{r.desc}</span>
                </div>
                {(selectedUser.role || 'user') === r.id && <div className="role-picker-check">✓</div>}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>Danger Zone</h3>
          {!confirmDelete ? (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Remove this user
            </button>
          ) : (
            <div className="danger-confirm">
              <p>Are you sure? This will permanently delete <strong>{selectedUser.username}</strong> and all their API keys.</p>
              <div className="danger-confirm-actions">
                <button className="btn btn-danger" onClick={() => deleteUser(selectedUser.id)}>Yes, delete user</button>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div>
      <div className="settings-section-header">
        <div>
          <h2>Users</h2>
          <p>Manage team members and their access levels</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {loading ? <p className="text-muted">Loading...</p> : (
        <div className="user-list">
          {users.map(user => {
            const r = roles.find(x => x.id === (user.role || 'user')) || roles[2]
            return (
              <div className="user-list-item" key={user.id} onClick={() => setSelectedUser(user)}>
                <div className="user-list-left">
                  <div className="user-list-avatar" style={{ background: getColor(user.username) }}>
                    {getInitials(user.username)}
                  </div>
                  <div>
                    <div className="user-list-name">{user.username}</div>
                    <div className="user-list-date">Joined {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                  </div>
                </div>
                <div className="user-list-role" style={{ background: r.bg, color: r.color }}>
                  {r.icon} {r.label}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Add New User</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">Create a new team member account.</p>
            <form onSubmit={createUser} className="modal-form">
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label>Username</label>
                <input className="form-input" type="text" placeholder="e.g. john" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <div className="role-select-grid">
                  {roles.map(r => (
                    <button type="button" key={r.id} className={`role-select-item ${newUser.role === r.id ? 'role-select-active' : ''}`} onClick={() => setNewUser({ ...newUser, role: r.id })}>
                      <span style={{ color: r.color }}>{r.icon}</span> {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersTab
