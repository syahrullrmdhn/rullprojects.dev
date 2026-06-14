import { useState, useEffect } from 'react'
import { RefreshCw, Circle, Zap, Shield, Server, ArrowRight, Clock, CheckCircle2, AlertTriangle, XCircle, Send, GitBranch, Repeat, Check, AlertOctagon, Wifi, DollarSign, Timer } from 'lucide-react'

function Status() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchStatus() }, [])

  const fetchStatus = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/status', { headers })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        setLastChecked(new Date())
      }
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusText = (s) => {
    if (s === 'online') return 'Operational'
    if (s === 'degraded') return 'Degraded'
    return 'Offline'
  }

  const getProviderIcon = (name) => {
    if (name === 'claudefire') return <Zap size={22} />
    if (name === 'sumopod') return <Shield size={22} />
    return <Server size={22} />
  }

  return (
    <div className="status-page">
      <div className="page-header">
        <div>
          <h1>System Status</h1>
          <p>Real-time health monitoring for all providers and services</p>
        </div>
        <button className="btn-refresh" onClick={fetchStatus} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Checking systems...</p></div>
      ) : status && (
        <>
          {/* System Banner */}
          <div className="sys-banner">
            <div className="sys-banner-left">
              <div className="sys-banner-icon">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3>All systems operational</h3>
                <p>{lastChecked && `Last checked at ${lastChecked.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}</p>
              </div>
            </div>
            <div className="sys-banner-pill">
              <Clock size={13} />
              Auto-failover enabled
            </div>
          </div>

          {/* Provider Cards */}
          <div className="provider-grid">
            {status.providers.map((provider) => (
              <div className="prov-card" key={provider.name}>
                <div className="prov-card-top">
                  <div className={`prov-icon prov-icon-${provider.status}`}>
                    {getProviderIcon(provider.name)}
                  </div>
                  <div className={`prov-status-badge prov-status-${provider.status}`}>
                    {provider.status === 'online' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {getStatusText(provider.status)}
                  </div>
                </div>
                <div className="prov-card-info">
                  <h3>{provider.name}</h3>
                  <p>{provider.description}</p>
                </div>
                <div className="prov-card-metrics">
                  <div className="prov-metric">
                    <span className="prov-metric-label">Latency</span>
                    <span className={`prov-metric-value ${provider.latency_ms < 100 ? 'metric-good' : provider.latency_ms < 500 ? 'metric-ok' : 'metric-bad'}`}>
                      {provider.latency_ms}ms
                      <span className="metric-trend">↓</span>
                    </span>
                  </div>
                  <div className="prov-metric">
                    <span className="prov-metric-label">Models</span>
                    <span className="prov-metric-value">{provider.models}</span>
                  </div>
                  <div className="prov-metric">
                    <span className="prov-metric-label">Priority</span>
                    <span className="prov-metric-value">{provider.priority === 0 ? 'Router' : `#${provider.priority}`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Failover Flow */}
          <div className="flow-card">
            <div className="flow-card-header">
              <div>
                <h3>How Auto-Failover Works</h3>
                <p>Your requests are always routed to the best available provider</p>
              </div>
            </div>
            <div className="flow-steps">
              <div className="flow-step">
                <div className="flow-step-icon"><Send size={16} /></div>
                <div className="flow-step-content">
                  <h4>Request Received</h4>
                  <p>API call arrives at router</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-step-icon flow-step-primary"><GitBranch size={16} /></div>
                <div className="flow-step-content">
                  <h4>Try Primary</h4>
                  <p>Routes to claudefire (#1)</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step">
                <div className="flow-step-icon flow-step-fallback"><Repeat size={16} /></div>
                <div className="flow-step-content">
                  <h4>Auto-Fallback</h4>
                  <p>Switches to sumopod (#2)</p>
                </div>
              </div>
              <div className="flow-connector"><ArrowRight size={16} /></div>
              <div className="flow-step flow-step-done">
                <div className="flow-step-icon flow-step-success"><Check size={16} /></div>
                <div className="flow-step-content">
                  <h4>Response Delivered</h4>
                  <p>Zero downtime for you</p>
                </div>
              </div>
            </div>

            <div className="flow-triggers">
              <h4>Failover triggers automatically when:</h4>
              <div className="flow-triggers-grid">
                <div className="trigger-item">
                  <AlertOctagon size={14} className="trigger-icon" />
                  Provider returns an error (5xx, timeout)
                </div>
                <div className="trigger-item">
                  <Wifi size={14} className="trigger-icon" />
                  Provider is unreachable or degraded
                </div>
                <div className="trigger-item">
                  <DollarSign size={14} className="trigger-icon" />
                  Budget limit exceeded on primary key
                </div>
                <div className="trigger-item">
                  <Timer size={14} className="trigger-icon" />
                  Rate limit hit (429 Too Many Requests)
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Status
