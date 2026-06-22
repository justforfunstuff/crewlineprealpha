import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, X, Briefcase, Users, FileText, Receipt, MessageSquare, LogOut, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { messages, jobs, invoices, estimates } = useApp();
  const { profile, tenant, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = messages.filter(m => !m.read && m.direction === 'inbound').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const pendingEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'viewed').length;
  const totalAlerts = unreadCount + overdueCount;

  const displayName = profile?.full_name || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { customers } = useApp();
  const q = query.toLowerCase().trim();
  const results = q.length < 2 ? [] : [
    ...customers.filter(c => `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(q)).slice(0, 3).map(c => ({ type: 'customer' as const, id: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.phone, icon: Users })),
    ...jobs.filter(j => `${j.title} ${j.description}`.toLowerCase().includes(q)).slice(0, 3).map(j => ({ type: 'job' as const, id: j.id, label: j.title, sub: j.scheduledDate, icon: Briefcase })),
    ...estimates.filter(e => e.number.toLowerCase().includes(q)).slice(0, 2).map(e => ({ type: 'estimate' as const, id: e.id, label: e.number, sub: `$${e.total.toLocaleString()}`, icon: FileText })),
    ...invoices.filter(i => i.number.toLowerCase().includes(q)).slice(0, 2).map(i => ({ type: 'invoice' as const, id: i.id, label: i.number, sub: `$${i.total.toLocaleString()}`, icon: Receipt })),
  ];

  const handleSelect = (r: typeof results[0]) => {
    setShowResults(false); setQuery('');
    const routes: Record<string, string> = { customer: '/customers', job: '/jobs', estimate: '/estimates', invoice: '/invoices' };
    navigate(routes[r.type] || '/');
  };

  const notifications = [
    ...(overdueCount > 0 ? [{ icon: Receipt, text: `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''} need attention`, action: '/invoices', color: 'var(--danger)' }] : []),
    ...(unreadCount > 0 ? [{ icon: MessageSquare, text: `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`, action: '/messages', color: 'var(--primary)' }] : []),
    ...(pendingEstimates > 0 ? [{ icon: FileText, text: `${pendingEstimates} estimate${pendingEstimates > 1 ? 's' : ''} awaiting response`, action: '/estimates', color: 'var(--purple)' }] : []),
    { icon: Briefcase, text: `${jobs.filter(j => j.status === 'in_progress').length} jobs in progress today`, action: '/jobs', color: 'var(--warning)' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuClick}><Menu size={20} /></button>

      {tenant && <span className="tenant-name">{tenant.name}</span>}

      <div className="topbar-search" ref={searchRef}>
        <Search size={16} className="search-icon" />
        <input type="text" placeholder="Search jobs, customers, invoices..." value={query} onChange={e => { setQuery(e.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} />
        {query && <button className="search-clear" onClick={() => { setQuery(''); setShowResults(false); }}><X size={14} /></button>}
        {showResults && results.length > 0 && (
          <div className="search-results">
            {results.map((r, i) => (
              <button key={`${r.type}-${r.id}-${i}`} className="search-result-item" onClick={() => handleSelect(r)}>
                <r.icon size={16} />
                <div><strong>{r.label}</strong><span>{r.sub}</span></div>
                <span className="result-type">{r.type}</span>
              </button>
            ))}
          </div>
        )}
        {showResults && q.length >= 2 && results.length === 0 && (
          <div className="search-results"><div className="search-empty">No results found</div></div>
        )}
      </div>

      <div className="topbar-actions">
        <div className="notification-wrapper" ref={notifRef}>
          <button className="topbar-btn notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {totalAlerts > 0 && <span className="notification-badge">{totalAlerts}</span>}
          </button>
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notif-header"><strong>Notifications</strong></div>
              {notifications.map((n, i) => (
                <button key={i} className="notif-item" onClick={() => { navigate(n.action); setShowNotifications(false); }}>
                  <n.icon size={16} style={{ color: n.color }} />
                  <span>{n.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="user-menu-wrapper" ref={userRef}>
          <button className="topbar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{displayName}</span>
          </button>
          {showUserMenu && (
            <div className="notification-dropdown user-dropdown">
              <div className="notif-header">
                <strong>{displayName}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-light)', display: 'block' }}>{profile?.email}</span>
              </div>
              {isAdmin && (
                <button className="notif-item" onClick={() => { navigate('/admin'); setShowUserMenu(false); }}>
                  <Shield size={16} style={{ color: 'var(--purple)' }} />
                  <span>Admin Portal</span>
                </button>
              )}
              <button className="notif-item" onClick={handleSignOut}>
                <LogOut size={16} style={{ color: 'var(--danger)' }} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
