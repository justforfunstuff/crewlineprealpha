import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Zap, Shield, DollarSign } from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/businesses', icon: Building2, label: 'Businesses' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
];

export default function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`sidebar admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" onClick={onToggle}>
        <Zap className="sidebar-logo-icon" />
        {!collapsed && <span className="sidebar-brand">Crewline</span>}
      </div>
      {!collapsed && (
        <div className="admin-badge-bar">
          <Shield size={12} />
          <span>Admin Portal</span>
        </div>
      )}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/" className="sidebar-link">
          <Building2 size={20} />
          {!collapsed && <span>Back to App</span>}
        </NavLink>
      </div>
    </aside>
  );
}
