import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, X, Briefcase, Users, FileText, Receipt, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { messages, jobs, customers, invoices, estimates } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = messages.filter(m => !m.read && m.direction === 'inbound').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const pendingEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'viewed').length;
  const totalAlerts = unreadCount + overdueCount;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuClick}><Menu size={20} /></button>
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
        <div className="topbar-user">
          <div className="user-avatar">LP</div>
          <span className="user-name">Lakin B.</span>
        </div>
      </div>
    </header>
  );
}
