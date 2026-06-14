import { useState, useEffect } from 'react'
import { Globe, Key, Shield } from 'lucide-react'

function GeneralTab() {
  const [stats, setStats] = useState(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <div>
      <div className="settings-section-header">
        <h2>General</h2>
        <p>Overview of your router configuration</p>
      </div>

      <div className="settings-cards">
        <div className="settings-info-card">
          <div className="settings-info-icon"><Globe size={18} /></div>
          <div>
            <h4>API Endpoint</h4>
            <code className="settings-code">https://router.rullprojects.dev/v1</code>
          </div>
        </div>
        <div className="settings-info-card">
          <div className="settings-info-icon"><Key size={18} /></div>
          <div>
            <h4>Total API Keys</h4>
            <span className="settings-value">{stats?.total_keys ?? '—'}</span>
          </div>
        </div>
        <div className="settings-info-card">
          <div className="settings-info-icon"><Shield size={18} /></div>
          <div>
            <h4>Router Strategy</h4>
            <span className="settings-value">Latency-based with failover</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Configuration</h3>
        <div className="settings-field-group">
          <div className="settings-field">
            <label>Routing Strategy</label>
            <div className="settings-field-value">latency-based-routing</div>
          </div>
          <div className="settings-field">
            <label>Max Retries</label>
            <div className="settings-field-value">3</div>
          </div>
          <div className="settings-field">
            <label>Cooldown Time</label>
            <div className="settings-field-value">30 seconds</div>
          </div>
          <div className="settings-field">
            <label>Request Timeout</label>
            <div className="settings-field-value">600 seconds</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneralTab
