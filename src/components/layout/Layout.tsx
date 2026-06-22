import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(p => !p)} />
      <div className="main-area">
        <TopBar onMenuClick={() => setSidebarCollapsed(p => !p)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
