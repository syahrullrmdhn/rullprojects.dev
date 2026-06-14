import { Zap, Shield, ExternalLink } from 'lucide-react'

function ProvidersTab() {
  const providers = [
    {
      name: 'Claudefire',
      icon: <Zap size={18} />,
      color: '#059669',
      bg: '#ecfdf5',
      endpoint: 'http://127.0.0.1:20129/v1',
      models: 6,
      type: 'Anthropic Claude (direct proxy)',
      priority: 1,
      features: ['Claude Opus 4.8', 'Claude Opus 4.7', 'Claude Sonnet 4.5', 'Thinking models'],
    },
    {
      name: 'Sumopod',
      icon: <Shield size={18} />,
      color: '#4f46e5',
      bg: '#eef2ff',
      endpoint: 'https://ai.sumopod.com/v1',
      models: 42,
      type: 'Multi-provider gateway',
      priority: 2,
      features: ['GPT-5 series', 'Gemini 3.x', 'Claude via proxy', 'DeepSeek', 'Qwen', 'GLM', 'Kimi'],
    },
  ]

  return (
    <div>
      <div className="settings-section-header">
        <div>
          <h2>Providers</h2>
          <p>Connected LLM providers and their configuration</p>
        </div>
      </div>

      <div className="provider-detail-list">
        {providers.map(p => (
          <div className="provider-detail-card" key={p.name}>
            <div className="provider-detail-top">
              <div className="provider-detail-icon" style={{ background: p.bg, color: p.color }}>
                {p.icon}
              </div>
              <div className="provider-detail-meta">
                <h3>{p.name}</h3>
                <span className="provider-detail-type">{p.type}</span>
              </div>
              <div className="provider-detail-priority">Priority #{p.priority}</div>
            </div>

            <div className="provider-detail-fields">
              <div className="provider-detail-field">
                <label>Endpoint</label>
                <code>{p.endpoint}</code>
              </div>
              <div className="provider-detail-field">
                <label>Models Available</label>
                <span>{p.models}</span>
              </div>
            </div>

            <div className="provider-detail-models">
              <label>Supported Models</label>
              <div className="provider-model-tags">
                {p.features.map(f => (
                  <span className="provider-model-tag" key={f}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProvidersTab
