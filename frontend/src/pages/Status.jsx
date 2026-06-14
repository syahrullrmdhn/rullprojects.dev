import { useState, useEffect } from 'react'
import { RefreshCw, Circle, Zap, Shield, Server, ArrowRightLeft, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

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

  const getStatusIcon = (s) => {
    if (s === 'online') return <CheckCircle2 size={18} className="status-icon-online" />
    if (s === 'degraded') return <AlertTriangle size={18} className="status-icon-degraded" />
    return <XCircle size={18} className="status-icon-offline" />
  }

  const getStatusText = (s) => {
    if (s === 'online') return 'Operational'
    if (s === 'degraded') return 'Degraded'
    return 'Offline'
  }

  const getStatusClass = (s) => {
    if (s === 'online') return 'status-pill-online'
    if (s === 'degraded') return 'status-pill-degraded'
    return 'status-pill-offline'
  }

  const getLatencyClass = (ms) => {
    if (ms < 200) return 'latency-good'
    if (ms < 1000) return 'latency-ok'
    return 'latency-slow'
  }

  const getProviderIcon = (name) => {
    if (name === 'claudefire') return <Zap size={20} />
    if (name === 'sumopod') return <Shield size={20} />
    return <Server size={20} />
  }

  const getSystemStatusMessage = () => {
    if (!status) return ''
    if (status.system_status === 'operational') return 'All systems operational'
    return 'Some systems experiencing issues'
  }

  const getSystemStatusEmoji = () => {
    if (!status) return ''
    if (status.system_status === 'operational') return '🟢'
    return '🟡'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Status</h1>
          <p>Real-time health of all providers and services</p>
        </div>
        <button className={`btn btn-secondary ${refreshing ? 'btn-spinning' : ''}`} onClick={fetchStatus} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Checking systems...</p></div>
      ) : status && (
        <>
          {/* System Banner */}
          <div className={`status-banner ${status.system_status === 'operational' ? 'status-banner-ok' : 'status-banner-warn'}`}>
            <div className="status-banner-content">
              <span className="status-banner-emoji">{getSystemStatusEmoji()}</span>
              <div>
                <h3>{getSystemStatusMessage()}</h3>
                <p>
                  {lastChecked && `Last checked ${lastChecked.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                </p>
              </div>
            </div>
            <div className="status-banner-badge">
              <Clock size={14} />
              Auto-failover enabled
            </div>
          </div>

          {/* Provider Cards */}
          <div className="status-grid">
            {status.providers.map((provider) => (
              <div className="status-card" key={provider.name}>
                <div className="status-card-header">
                  <div className="status-card-provider">
                    <div className={`status-card-icon ${provider.status === 'online' ? 'status-card-icon-online' : provider.status === 'degraded' ? 'status-card-icon-degraded' : 'status-card-icon-offline'}`}>
                      {getProviderIcon(provider.name)}
                    </div>
                    <div>
                      <h3>{provider.name}</h3>
                      <p>{provider.description}</p>
                    </div>
                  </div>
                  <div className={`status-pill ${getStatusClass(provider.status)}`}>
                    {getStatusIcon(provider.status)}
                    {getStatusText(provider.status)}
                  </div>
                </div>

                <div className="status-card-stats">
                  <div className="status-stat">
                    <span className="status-stat-label">Latency</span>
                    <span className={`status-stat-value ${getLatencyClass(provider.latency_ms)}`}>
                      {provider.latency_ms}ms
                    </span>
                  </div>
                  <div className="status-stat">
                    <span className="status-stat-label">Models</span>
                    <span className="status-stat-value">{provider.models}</span>
                  </div>
                  <div className="status-stat">
                    <span className="status-stat-label">Priority</span>
                    <span className="status-stat-value">
                      {provider.priority === 0 ? 'Router' : `#${provider.priority}`}
                    </span>
                  </div>
                </div>

                {provider.priority > 0 && (
                  <div className="status-card-footer">
                    <ArrowRightLeft size={13} />
                    {provider.priority === 1
                      ? 'Primary provider — requests go here first'
                      : 'Fallback provider — activates when primary is down or budget exceeded'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Failover Info */}
          <div className="section" style={{ marginTop: 24 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>How Auto-Failover Works</h3>
                  <p>Your requests are always routed to the best available provider</p>
                </div>
                <ArrowRightLeft size={20} className="text-muted" />
              </div>
              <div className="failover-flow">
                <div className="failover-step">
                  <div className="failover-step-num">1</div>
                  <div>
                    <h4>Request Received</h4>
                    <p>Your API call arrives at the router</p>
                  </div>
                </div>
                <div className="failover-arrow">→</div>
                <div className="failover-step">
                  <div className="failover-step-num">2</div>
                  <div>
                    <h4>Try Primary</h4>
                    <p>Routes to claudefire (Priority #1)</p>
                  </div>
                </div>
                <div className="failover-arrow">→</div>
                <div className="failover-step">
                  <div className="failover-step-num">3</div>
                  <div>
                    <h4>Auto-Fallback</h4>
                    <p>If primary fails → switches to sumopod</p>
                  </div>
                </div>
                <div className="failover-arrow">→</div>
                <div className="failover-step failover-step-success">
                  <div className="failover-step-num">✓</div>
                  <div>
                    <h4>Response Delivered</h4>
                    <p>Seamless, no downtime for you</p>
                  </div>
                </div>
              </div>
              <div className="failover-triggers">
                <h4>Failover triggers automatically when:</h4>
                <ul>
                  <li>Provider returns an error (5xx, timeout)</li>
                  <li>Budget limit is exceeded on primary key</li>
                  <li>Provider is unreachable or degraded</li>
                  <li>Rate limit hit (429 Too Many Requests)</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Status
