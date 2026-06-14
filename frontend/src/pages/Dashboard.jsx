import { useState, useEffect } from 'react'
import { Key, Users, Activity, Globe, DollarSign, Zap, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function Dashboard() {
  const [stats, setStats] = useState({ totalKeys: 0, totalUsers: 0, health: 'unknown' })
  const [usage, setUsage] = useState({ daily: [], total_spend: 0, total_tokens: 0, total_requests: 0 })
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, usageRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/usage', { headers }),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats({
          totalKeys: data.total_keys || 0,
          totalUsers: data.total_users || 0,
          health: data.litellm_status || 'unknown',
        })
      }

      if (usageRes.ok) {
        const data = await usageRes.json()
        setUsage(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const formatDollar = (value) => {
    if (value >= 1) return `$${value.toFixed(2)}`
    if (value >= 0.01) return `$${value.toFixed(3)}`
    return `$${value.toFixed(4)}`
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
    return null
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your API router usage and status.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">
            <DollarSign size={16} />
            Total Spend
          </div>
          <div className="stat-card-value">{loading ? '—' : formatDollar(usage.total_spend || 0)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <Zap size={16} />
            Total Requests
          </div>
          <div className="stat-card-value">{loading ? '—' : (usage.total_requests || 0).toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <Key size={16} />
            API Keys
          </div>
          <div className="stat-card-value">{loading ? '—' : stats.totalKeys}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <Activity size={16} />
            LiteLLM Status
          </div>
          <div className={`stat-card-value ${stats.health === 'healthy' ? 'healthy' : ''}`}>
            {loading ? '—' : stats.health === 'healthy' ? 'Healthy' : stats.health === 'unreachable' ? 'Down' : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="section">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Usage (Last 30 Days)</h3>
              <p>Daily spend and request volume</p>
            </div>
            <div className="chart-legend">
              <span className="chart-legend-item">
                <span className="chart-legend-dot spend"></span> Spend
              </span>
              <span className="chart-legend-item">
                <span className="chart-legend-dot requests"></span> Requests
              </span>
            </div>
          </div>
          <div className="chart-container">
            {usage.daily && usage.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={usage.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="spend"
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="requests"
                    orientation="right"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="spend"
                    type="monotone"
                    dataKey="spend"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpend)"
                  />
                  <Area
                    yAxisId="requests"
                    type="monotone"
                    dataKey="requests"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <TrendingUp size={40} strokeWidth={1.5} />
                <p>No usage data yet. Start making API calls to see your chart.</p>
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
              <p>Use any OpenAI-compatible client to connect</p>
            </div>
            <Globe size={18} className="text-muted" />
          </div>
          <div className="code-block">
            <code>
              <span className="code-keyword">curl</span> https://router.rullprojects.dev/v1/chat/completions \{'\n'}
              {'  '}-H <span className="code-string">"Authorization: Bearer YOUR_API_KEY"</span> \{'\n'}
              {'  '}-H <span className="code-string">"Content-Type: application/json"</span> \{'\n'}
              {'  '}-d <span className="code-string">'{`{"model": "gpt-5", "messages": [{"role": "user", "content": "Hello"}]}`}'</span>
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
