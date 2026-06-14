import { useState } from 'react'
import { Settings as SettingsIcon, Users, Activity, Server } from 'lucide-react'
import GeneralTab from './settings/GeneralTab'
import UsersTab from './settings/UsersTab'
import StatusTab from './settings/StatusTab'
import ProvidersTab from './settings/ProvidersTab'

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'providers', label: 'Providers', icon: Server },
]

function Settings() {
  const [active, setActive] = useState('general')

  const renderTab = () => {
    switch (active) {
      case 'general': return <GeneralTab />
      case 'users': return <UsersTab />
      case 'status': return <StatusTab />
      case 'providers': return <ProvidersTab />
      default: return <GeneralTab />
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your router configuration, team, and providers</p>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-nav-item ${active === tab.id ? 'settings-nav-active' : ''}`}
              onClick={() => setActive(tab.id)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {renderTab()}
        </div>
      </div>
    </div>
  )
}

export default Settings
