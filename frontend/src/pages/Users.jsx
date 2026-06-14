import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Shield, ShieldCheck, User, Eye } from 'lucide-react'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers })
      if (res.ok) { const data = await res.json(); setUsers(data.users || []) }
    } catch {} finally { setLoading(false) }
  }

  const createUser = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers,
        body: JSON.stringify({ username: newUser.username, password: newUser.password }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || 'Failed'); return }
      const userData = await res.json()
      if (newUser.role !== 'user' && userData.user) {
        await fetch(`/api/users/${userData.user.id}/role`, {
          method: 'PUT', headers,
          body: JSON.stringify({ role: newUser.role, is_admin: newUser.role === 'admin' }),
        })
      }
      setShowModal(false)
      setNewUser({ username: '', password: '', role: 'user' })
      fetchUsers()
    } catch { setError('Failed to create user') }
  }

  const updateRole = async (userId, role) => {
    await fetch(`/api/users/${userId}/role`, { method: 'PUT', headers, body: JSON.stringify({ role, is_admin: role === 'admin' }) })
    fetchUsers()
  }

  const deleteUser = async (id) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE', headers })
    setDeleteConfirm(null)
    fetchUsers()
  }

  const getInitials = (n) => n.slice(0, 2).toUpperCase()
  const getColor = (n) => {
    const c = ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
    return c[Math.abs(h) % c.length]
  }

  const roleConfig = {
    admin: { icon: <ShieldCheck size={13} />, bg: '#ecfdf5', color: '#059669', label: 'Admin' },
    editor: { icon: <Shield size={13} />, bg: '#eef2ff', color: '#4f46e5', label: 'Editor' },
    user: { icon: <User size={13} />, bg: '#f3f4f6', color: '#374151', label: 'User' },
    viewer: { icon: <Eye size={13} />, bg: '#fefce8', color: '#92400e', label: 'Viewer' },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Manage team members and access control</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading...</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = roleConfig[user.role] || roleConfig.user
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-clean" style={{ background: getColor(user.username) }}>
                            {getInitials(user.username)}
                          </div>
                          <div>
                            <div className="user-name">{user.username}</div>
                            <div className="user-meta">{user.is_admin ? 'Administrator' : 'Team member'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select className="role-select" value={user.role || 'user'} onChange={(e) => updateRole(user.id, e.target.value)}>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="user">User</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td><span className="text-muted">{user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></td>
                      <td>
                        {deleteConfirm === user.id ? (
                          <div className="table-actions">
                            <button className="btn btn-danger btn-sm" onClick={() => deleteUser(user.id)}>Delete</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn-icon-danger" onClick={() => setDeleteConfirm(user.id)} title="Remove user">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Info */}
      <div className="section" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Role Permissions</h3>
              <p>What each role can do in this console</p>
            </div>
          </div>
          <div className="roles-grid">
            {Object.entries(roleConfig).map(([key, cfg]) => (
              <div className="role-info-card" key={key}>
                <div className="role-info-badge" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon} {cfg.label}
                </div>
                <p>
                  {key === 'admin' && 'Full access. Manage users, keys, models, and all settings.'}
                  {key === 'editor' && 'Create and manage own API keys. View models and usage.'}
                  {key === 'user' && 'Use assigned API keys. View own usage data only.'}
                  {key === 'viewer' && 'Read-only access. View models and dashboard only.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New User</h2>
            <p className="modal-subtitle">Create a new team member account.</p>
            <form onSubmit={createUser} className="modal-form">
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label>Username</label>
                <input className="form-input" type="text" placeholder="e.g. john" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
