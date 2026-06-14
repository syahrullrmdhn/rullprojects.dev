import { useState, useEffect } from 'react'
import { Key, Activity, Globe, DollarSign, Zap, TrendingUp, Copy, Check } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function Dashboard() {
  const [stats, setStats] = useState({ totalKeys: 0, totalUsers: 0, health: 'unknown' })
  const [usage, setUsage] = useState({ daily: [], total_spend: 0, total_tokens: 0, total_requests: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [statsRes, usageRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/usage', { headers }),
      ])
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats({ totalKeys: data.total_keys || 0, totalUsers: data.total_users || 0, health: data.litellm_status || 'unknown' })
      }
      if (usageRes.ok) setUsage(await usageRes.json())
    } catch {} finally { setLoading(false) }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''
  const formatDollar = (v) => v >= 1 ? `$${v.toFixed(2)}` : v >= 0.01 ? `$${v.toFixed(3)}` : `$${v.toFixed(4)}`

  const copyCode = () => {
    navigator.clipboard.writeText(`curl https://router.rullprojects.dev/v1/chat/completions \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "gpt-5", "messages": [{"role": "user", "content": "Hello"}]}'`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-date">{formatDate(label)}</p>
        <p className="chart-tooltip-value">
          <span className="chart-tooltip-dot spend"></span>
          Spend: {formatDollar(payload[0]?.value || 0)}
        </p>
        {payload[1] && (
          <p className="chart-tooltip-value">
            <span className="chart-tooltip-dot requests"></span>
            Requests: {payload[1].value}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your API router usage and status</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label"><DollarSign size={15} /> Total Spend</div>
          <div className="stat-card-value">{loading ? '—' : formatDollar(usage.total_spend || 0)}</div>
          {!loading && <div className="stat-trend stat-trend-up">↑ active today</div>}
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Zap size={15} /> Total Requests</div>
          <div className="stat-card-value">{loading ? '—' : (usage.total_requests || 0).toLocaleString()}</div>
          {!loading && <div className="stat-trend stat-trend-up">↑ {usage.daily?.length || 0} days tracked</div>}
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Key size={15} /> API Keys</div>
          <div className="stat-card-value">{loading ? '—' : stats.totalKeys}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Activity size={15} /> Router Status</div>
          <div className={`stat-card-value ${stats.health === 'healthy' ? 'healthy' : ''}`}>
            {loading ? '—' : stats.health === 'healthy' ? 'Healthy' : stats.health === 'unreachable' ? 'Down' : 'Unknown'}
          </div>
          {!loading && stats.health === 'healthy' && <div className="stat-trend stat-trend-up">● All systems go</div>}
        </div>
      </div>

      {/* Usage Chart */}
      <div className="section">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Usage — Last 30 Days</h3>
              <p>Daily spend and request volume</p>
            </div>
            <div className="chart-legend">
              <span className="chart-legend-item"><span className="chart-legend-dot spend"></span> Spend</span>
              <span className="chart-legend-item"><span className="chart-legend-dot requests"></span> Requests</span>
            </div>
          </div>
          <div className="chart-container">
            {usage.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={usage.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaedf0" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#eaedf0' }} tickLine={false} />
                  <YAxis yAxisId="spend" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="requests" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpend)" />
                  <Area yAxisId="requests" type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <TrendingUp size={36} strokeWidth={1.5} />
                <p>No usage data yet. Make API calls to see your chart.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="section">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Quick Start</h3>
              <p>Connect with any OpenAI-compatible client</p>
            </div>
            <button className="btn-copy" onClick={copyCode}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="terminal-block">
            <div className="terminal-header">
              <span className="terminal-dot red"></span>
              <span className="terminal-dot yellow"></span>
              <span className="terminal-dot green"></span>
            </div>
            <pre className="terminal-code"><span className="t-cmd">curl</span> https://router.rullprojects.dev/v1/chat/completions \{'\n'}  -H <span className="t-str">"Authorization: Bearer YOUR_API_KEY"</span> \{'\n'}  -H <span className="t-str">"Content-Type: application/json"</span> \{'\n'}  -d <span className="t-str">{'\'{"model": "gpt-5", "messages": [{"role": "user", "content": "Hello"}]}\''}</span></pre>
          </div>
          <div className="endpoint-row">
            <Globe size={15} className="text-muted" />
            <span className="endpoint-label">Base URL:</span>
            <code className="endpoint-value">https://router.rullprojects.dev/v1</code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
