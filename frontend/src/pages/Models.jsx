import { useState, useEffect } from 'react'
import { Search, Boxes, Circle } from 'lucide-react'

function Models() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => { fetchModels() }, [])

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.models || data.data || []
        // All models from LiteLLM are online if returned
        setModels(list.map(m => ({ ...m, status: 'online' })))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const filtered = models.filter((m) => {
    const name = m.model_name || m.id || m.name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const getProvider = (model) => {
    const id = model.id || model.name || ''
    const parts = id.split('/')
    if (parts.length >= 2) return parts[0]
    return model.provider || 'default'
  }

  const getModelName = (model) => {
    const id = model.id || model.name || ''
    const parts = id.split('/')
    if (parts.length >= 2) return parts[1]
    return id
  }

  const providers = [...new Set(filtered.map(getProvider))]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Models</h1>
          <p>Available models and their status</p>
        </div>
        <span className="count-badge">{filtered.length} models</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          className="search-input"
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading models...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Boxes size={40} />
          <p>{search ? 'No models match your search.' : 'No models available.'}</p>
        </div>
      ) : (
        providers.map(provider => (
          <div key={provider} className="section">
            <div className="provider-header">
              <span className={`provider-badge ${provider === 'claudefire' ? 'provider-claudefire' : 'provider-sumopod'}`}>
                {provider}
              </span>
              <span className="provider-count">{filtered.filter(m => getProvider(m) === provider).length} models</span>
            </div>
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
                    {filtered.filter(m => getProvider(m) === provider).map((model, idx) => (
                      <tr key={model.id || idx}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{getModelName(model)}</span>
                        </td>
                        <td>
                          <span className="status-badge status-online">
                            <Circle size={8} fill="currentColor" />
                            Online
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${provider === 'claudefire' ? 'badge-green' : 'badge-outline'}`}>
                            {provider}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default Models
