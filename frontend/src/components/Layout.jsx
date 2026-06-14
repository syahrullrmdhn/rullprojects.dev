import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
