import { useState, useEffect } from 'react'
import { RefreshCw, Zap, Shield, Server, ArrowRight, Clock, CheckCircle2, AlertTriangle, Send, GitBranch, Repeat, Check, AlertOctagon, Wifi, DollarSign, Timer } from 'lucide-react'

function StatusTab() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchStatus() }, [])

  const fetchStatus = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/status', { headers })
      if (res.ok) setStatus(await res.json())
    } catch {} finally { setLoading(false); setRefreshing(false) }
  }

  const getIcon = (name) => {
    if (name === 'claudefire') return <Zap size={20} />
    if (name === 'sumopod') return <Shield size={20} />
    return <Server size={20} />
  }

  if (loading) return <p className="text-muted">Checking systems...</p>
  if (!status) return <p className="text-muted">Unable to check status.</p>

  return (
    <div>
      <div className="settings-section-header">
        <div>
          <h2>System Status</h2>
          <p>Real-time health of all providers</p>
        </div>
        <button className="btn-refresh" onClick={fetchStatus} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Banner */}
      <div className="sys-banner">
        <div className="sys-banner-left">
          <div className="sys-banner-icon"><CheckCircle2 size={20} /></div>
          <div>
            <h3>{status.system_status === 'operational' ? 'All systems operational' : 'Some issues detected'}</h3>
            <p>Checked at {new Date(status.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="sys-banner-pill"><Clock size={13} /> Auto-failover enabled</div>
      </div>

      {/* Providers */}
      <div className="provider-grid">
        {status.providers.map(p => (
          <div className="prov-card" key={p.name}>
            <div className="prov-card-top">
              <div className={`prov-icon prov-icon-${p.status}`}>{getIcon(p.name)}</div>
              <div className={`prov-status-badge prov-status-${p.status}`}>
                {p.status === 'online' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {p.status === 'online' ? 'Operational' : p.status === 'degraded' ? 'Degraded' : 'Offline'}
              </div>
            </div>
            <div className="prov-card-info">
              <h3>{p.name}</h3>
              <p>{p.description}</p>
            </div>
            <div className="prov-card-metrics">
              <div className="prov-metric">
                <span className="prov-metric-label">Latency</span>
                <span className={`prov-metric-value ${p.latency_ms < 100 ? 'metric-good' : 'metric-ok'}`}>{p.latency_ms}ms</span>
              </div>
              <div className="prov-metric">
                <span className="prov-metric-label">Models</span>
                <span className="prov-metric-value">{p.models}</span>
              </div>
              <div className="prov-metric">
                <span className="prov-metric-label">Priority</span>
                <span className="prov-metric-value">{p.priority === 0 ? 'Router' : `#${p.priority}`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Failover Flow */}
      <div className="flow-card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>How Auto-Failover Works</h3>
        <div className="flow-steps">
          <div className="flow-step">
            <div className="flow-step-icon"><Send size={15} /></div>
            <div className="flow-step-content"><h4>Received</h4><p>API call arrives</p></div>
          </div>
          <div className="flow-connector"><ArrowRight size={14} /></div>
          <div className="flow-step">
            <div className="flow-step-icon flow-step-primary"><GitBranch size={15} /></div>
            <div className="flow-step-content"><h4>Primary</h4><p>Try claudefire</p></div>
          </div>
          <div className="flow-connector"><ArrowRight size={14} /></div>
          <div className="flow-step">
            <div className="flow-step-icon flow-step-fallback"><Repeat size={15} /></div>
            <div className="flow-step-content"><h4>Fallback</h4><p>Switch to sumopod</p></div>
          </div>
          <div className="flow-connector"><ArrowRight size={14} /></div>
          <div className="flow-step flow-step-done">
            <div className="flow-step-icon flow-step-success"><Check size={15} /></div>
            <div className="flow-step-content"><h4>Delivered</h4><p>Zero downtime</p></div>
          </div>
        </div>
        <div className="flow-triggers">
          <h4>Triggers:</h4>
          <div className="flow-triggers-grid">
            <div className="trigger-item"><AlertOctagon size={13} className="trigger-icon" /> Server error (5xx)</div>
            <div className="trigger-item"><Wifi size={13} className="trigger-icon" /> Provider unreachable</div>
            <div className="trigger-item"><DollarSign size={13} className="trigger-icon" /> Budget exceeded</div>
            <div className="trigger-item"><Timer size={13} className="trigger-icon" /> Rate limit (429)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusTab
