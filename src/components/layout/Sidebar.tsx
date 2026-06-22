import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Briefcase, FileText, Receipt, Map, UserCog, MessageSquare, Globe, BarChart3, Zap } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/estimates', icon: FileText, label: 'Estimates' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/dispatch', icon: Map, label: 'Dispatch' },
  { to: '/team', icon: UserCog, label: 'Team' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/booking', icon: Globe, label: 'Booking' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" onClick={onToggle}>
        <Zap className="sidebar-logo-icon" />
        {!collapsed && <span className="sidebar-brand">Crewline</span>}
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && <span className="sidebar-version">v1.0.0</span>}
      </div>
    </aside>
  );
}
