import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Shield, ShieldCheck, User } from 'lucide-react'

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
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || 'Failed to create user')
        return
      }
      // Update role if not default
      if (newUser.role !== 'user') {
        const userData = await res.json()
        if (userData.user) {
          await fetch(`/api/users/${userData.user.id}/role`, {
            method: 'PUT', headers,
            body: JSON.stringify({ role: newUser.role, is_admin: newUser.role === 'admin' }),
          })
        }
      }
      setShowModal(false)
      setNewUser({ username: '', password: '', role: 'user' })
      fetchUsers()
    } catch {
      setError('Failed to create user')
    }
  }

  const updateRole = async (userId, role) => {
    try {
      await fetch(`/api/users/${userId}/role`, {
        method: 'PUT', headers,
        body: JSON.stringify({ role, is_admin: role === 'admin' }),
      })
      fetchUsers()
    } catch {}
  }

  const deleteUser = async (id) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE', headers })
      setDeleteConfirm(null)
      fetchUsers()
    } catch {}
  }

  const getRoleIcon = (role) => {
    if (role === 'admin') return <ShieldCheck size={14} />
    if (role === 'editor') return <Shield size={14} />
    return <User size={14} />
  }

  const getRoleBadgeClass = (role) => {
    if (role === 'admin') return 'role-badge role-admin'
    if (role === 'editor') return 'role-badge role-editor'
    return 'role-badge role-user'
  }

  const getInitials = (name) => {
    return name.slice(0, 2).toUpperCase()
  }

  const getAvatarColor = (name) => {
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Manage users and access control</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Add User
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
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ background: getAvatarColor(user.username) }}>
                          {getInitials(user.username)}
                        </div>
                        <div>
                          <div className="user-name">{user.username}</div>
                          <div className="user-meta">{user.is_admin ? 'Administrator' : 'Member'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={user.role || 'user'}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="user">User</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td>
                      <span className="text-muted">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </td>
                    <td>
                      {deleteConfirm === user.id ? (
                        <div className="table-actions">
                          <button className="btn btn-danger btn-sm" onClick={() => deleteUser(user.id)}>Confirm</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn-icon-danger" onClick={() => setDeleteConfirm(user.id)} title="Delete user">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
              <p>What each role can do</p>
            </div>
          </div>
          <div className="roles-grid">
            <div className="role-info-card">
              <div className={getRoleBadgeClass('admin')}>{getRoleIcon('admin')} Admin</div>
              <p>Full access. Manage users, keys, models, and settings.</p>
            </div>
            <div className="role-info-card">
              <div className={getRoleBadgeClass('editor')}>{getRoleIcon('editor')} Editor</div>
              <p>Create and manage own API keys. View models and usage.</p>
            </div>
            <div className="role-info-card">
              <div className={getRoleBadgeClass('user')}>{getRoleIcon('user')} User</div>
              <p>Use assigned API keys. View own usage only.</p>
            </div>
            <div className="role-info-card">
              <div className="role-badge role-viewer"><User size={14} /> Viewer</div>
              <p>Read-only access. View models and usage dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New User</h2>
            <p className="modal-subtitle">Create a new user account with a role.</p>
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
