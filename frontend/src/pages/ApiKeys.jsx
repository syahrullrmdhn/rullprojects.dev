import { useState, useEffect } from 'react'
import { Plus, Trash2, Key, Copy, DollarSign } from 'lucide-react'

function ApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newKey, setNewKey] = useState({ alias: '', budget: '' })
  const [createdKey, setCreatedKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => { fetchKeys() }, [])

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys', { headers })
      if (res.ok) {
        const data = await res.json()
        setKeys(Array.isArray(data.keys) ? data.keys : Array.isArray(data) ? data : [])
      }
    } catch {} finally { setLoading(false) }
  }

  const createKey = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/keys', {
        method: 'POST', headers,
        body: JSON.stringify({
          key_name: newKey.alias, alias: newKey.alias,
          budget_limit: newKey.budget ? Number(newKey.budget) : 0,
          rpm: 60, tpm: 100000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCreatedKey(data.key || '')
        setNewKey({ alias: '', budget: '' })
        fetchKeys()
      }
    } catch {}
  }

  const deleteKey = async (id) => {
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE', headers })
      setDeleteConfirm(null)
      fetchKeys()
    } catch {}
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getBudgetPercent = (used, limit) => {
    if (!limit || limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>API Keys</h1>
          <p>Create and manage API keys with usage budgets</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setCreatedKey('') }}>
          <Plus size={16} /> New Key
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading...</p></div>
      ) : keys.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Key size={48} strokeWidth={1.5} /></div>
          <h3>No API keys yet</h3>
          <p>Create your first API key to start using the router.</p>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setCreatedKey('') }}>
            <Plus size={16} /> Create Key
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Budget</th>
                  <th>Usage</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const percent = getBudgetPercent(key.budget_used || 0, key.budget_limit || 0)
                  return (
                    <tr key={key.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{key.key_name || 'Unnamed'}</span>
                      </td>
                      <td>
                        <code className="table-key-code">{key.key_prefix || '••••••••••'}</code>
                      </td>
                      <td>
                        {key.budget_limit > 0
                          ? <span className="budget-text">${key.budget_limit.toFixed(2)}/mo</span>
                          : <span className="text-muted">Unlimited</span>
                        }
                      </td>
                      <td>
                        {key.budget_limit > 0 ? (
                          <div className="table-budget">
                            <span className="budget-text-sm">${(key.budget_used || 0).toFixed(2)}</span>
                            <div className="budget-bar-sm">
                              <div
                                className={`budget-bar-fill ${percent > 80 ? 'warning' : ''} ${percent >= 100 ? 'danger' : ''}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted">
                          {key.created_at ? new Date(key.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td>
                        {deleteConfirm === key.id ? (
                          <div className="table-actions">
                            <button className="btn btn-danger btn-sm" onClick={() => deleteKey(key.id)}>Delete</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn-icon-danger" onClick={() => setDeleteConfirm(key.id)} title="Delete key">
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {createdKey ? (
              <>
                <div className="modal-success">
                  <div className="modal-success-icon"><Key size={24} /></div>
                  <h2>Key Created!</h2>
                  <p className="modal-subtitle">Copy this key now — you won't see it again.</p>
                </div>
                <div className="key-display">
                  <code>{createdKey}</code>
                  <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(createdKey)}>
                    <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => setShowModal(false)} style={{ width: '100%' }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <h2>Create New Key</h2>
                <p className="modal-subtitle">Set a name and monthly budget for this key.</p>
                <form onSubmit={createKey} className="modal-form">
                  <div className="form-group">
                    <label>Key Name</label>
                    <input className="form-input" type="text" placeholder="e.g. production-app" value={newKey.alias} onChange={(e) => setNewKey({ ...newKey, alias: e.target.value })} required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Monthly Budget (USD)</label>
                    <div className="input-with-prefix">
                      <span className="input-prefix">$</span>
                      <input className="form-input form-input-prefixed" type="number" step="0.01" min="0" placeholder="0.00 = unlimited" value={newKey.budget} onChange={(e) => setNewKey({ ...newKey, budget: e.target.value })} />
                    </div>
                    <span className="form-hint">Leave empty or 0 for unlimited usage</span>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Create Key</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiKeys
