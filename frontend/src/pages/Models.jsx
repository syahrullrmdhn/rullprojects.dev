import { useState, useEffect } from 'react'
import { Search, Boxes, Circle } from 'lucide-react'

function Models() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const token = localStorage.getItem('token')

  useEffect(() => { fetchModels() }, [])

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.models || data.data || []
        setModels(list.map(m => ({ ...m, status: 'online' })))
      }
    } catch {} finally { setLoading(false) }
  }

  const getProvider = (model) => {
    const id = model.id || model.name || ''
    const parts = id.split('/')
    return parts.length >= 2 ? parts[0] : model.provider || 'default'
  }

  const getModelName = (model) => {
    const id = model.id || model.name || ''
    const parts = id.split('/')
    return parts.length >= 2 ? parts[1] : id
  }

  const providers = ['all', ...new Set(models.map(getProvider))]

  const filtered = models.filter((m) => {
    const name = (m.id || m.name || '').toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchTab = activeTab === 'all' || getProvider(m) === activeTab
    return matchSearch && matchTab
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Models</h1>
          <p>Available models and their status</p>
        </div>
        <span className="count-badge">{filtered.length} models</span>
      </div>

      {/* Search + Tabs */}
      <div className="models-toolbar">
        <div className="search-field">
          <Search size={15} className="search-field-icon" />
          <input type="text" placeholder="Search models..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tab-nav">
          {providers.map(p => (
            <button key={p} className={`tab-btn ${activeTab === p ? 'tab-active' : ''}`} onClick={() => setActiveTab(p)}>
              {p === 'all' ? 'All' : p}
              {p !== 'all' && <span className="tab-count">{models.filter(m => getProvider(m) === p).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading models...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Boxes size={40} strokeWidth={1.5} />
          <h3>No models found</h3>
          <p>{search ? 'Try a different search term.' : 'No models available.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Provider</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((model, idx) => (
                  <tr key={model.id || idx}>
                    <td><span className="model-name-cell">{getModelName(model)}</span></td>
                    <td>
                      <span className="status-dot-badge">
                        <span className="status-dot-pulse"></span>
                        Online
                      </span>
                    </td>
                    <td>
                      <span className={`provider-pill provider-${getProvider(model)}`}>
                        {getProvider(model)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Models
