import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, Briefcase, Users, FileText, TrendingUp, Clock, AlertTriangle, CheckCircle2, Plus, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const KPI_IDS = ['revenue', 'jobs', 'customers', 'estimates'] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { jobs, customers, invoices, estimates, messages, team, dailyStats } = useApp();
  const [kpiOrder, setKpiOrder] = useState<typeof KPI_IDS[number][]>([...KPI_IDS]);
  const [dragKpi, setDragKpi] = useState<string | null>(null);

  const todayJobs = jobs.filter(j => j.scheduledDate === '2026-06-21');
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const pendingEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'viewed');
  const unreadMessages = messages.filter(m => !m.read && m.direction === 'inbound');
  const totalRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = dailyStats.length > 0 ? totalRevenue / dailyStats.length : 0;

  const chartData = dailyStats.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    revenue: d.revenue,
    jobs: d.jobsCompleted,
  }));

  const jobsByStatus = [
    { name: 'Scheduled', count: jobs.filter(j => j.status === 'scheduled').length, color: '#3B82F6', filter: 'scheduled' },
    { name: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length, color: '#F59E0B', filter: 'in_progress' },
    { name: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: '#10B981', filter: 'completed' },
    { name: 'On Hold', count: jobs.filter(j => j.status === 'on_hold').length, color: '#6B7280', filter: 'on_hold' },
  ];

  const handleKpiDragStart = (id: string) => setDragKpi(id);
  const handleKpiDrop = (targetId: string) => {
    if (!dragKpi || dragKpi === targetId) return;
    setKpiOrder(prev => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(dragKpi as typeof KPI_IDS[number]);
      const toIdx = newOrder.indexOf(targetId as typeof KPI_IDS[number]);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragKpi as typeof KPI_IDS[number]);
      return newOrder;
    });
    setDragKpi(null);
  };

  const kpiCards: Record<string, { icon: typeof DollarSign; iconClass: string; value: string; label: string; extra: React.ReactNode; link: string; addLink: string }> = {
    revenue: { icon: DollarSign, iconClass: 'blue', value: `$${totalRevenue.toLocaleString()}`, label: 'Weekly Revenue', extra: <div className="kpi-trend up"><TrendingUp size={14} /> 12%</div>, link: '/reports', addLink: '/invoices' },
    jobs: { icon: Briefcase, iconClass: 'green', value: `${todayJobs.length}`, label: "Today's Jobs", extra: <div className="kpi-badge">{activeJobs.length} active</div>, link: '/jobs', addLink: '/jobs' },
    customers: { icon: Users, iconClass: 'purple', value: `${customers.length}`, label: 'Total Customers', extra: <div className="kpi-trend up"><TrendingUp size={14} /> 3 new</div>, link: '/customers', addLink: '/customers' },
    estimates: { icon: FileText, iconClass: 'orange', value: `${pendingEstimates.length}`, label: 'Pending Estimates', extra: <div className="kpi-badge">${pendingEstimates.reduce((s, e) => s + e.total, 0).toLocaleString()}</div>, link: '/estimates', addLink: '/estimates' },
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="page-date">{format(new Date(2026, 5, 21), 'EEEE, MMMM d, yyyy')}</span>
      </div>

      <div className="kpi-grid">
        {kpiOrder.map(id => {
          const kpi = kpiCards[id];
          return (
            <div key={id} className={`kpi-card draggable ${dragKpi === id ? 'dragging' : ''}`} draggable onDragStart={() => handleKpiDragStart(id)} onDragOver={e => e.preventDefault()} onDrop={() => handleKpiDrop(id)} onClick={() => navigate(kpi.link)} style={{ cursor: 'pointer' }}>
              <GripVertical size={14} className="kpi-drag-handle" />
              <div className={`kpi-icon ${kpi.iconClass}`}><kpi.icon size={22} /></div>
              <div className="kpi-content">
                <span className="kpi-value">{kpi.value}</span>
                <span className="kpi-label">{kpi.label}</span>
              </div>
              {kpi.extra}
              <button className="kpi-add-btn" onClick={e => { e.stopPropagation(); navigate(kpi.addLink); }} title="Add new"><Plus size={14} /></button>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <div className="card chart-card">
          <div className="card-header-row"><h3>Revenue This Week</h3><button className="btn btn-sm" onClick={() => navigate('/reports')}><Plus size={12} /> View All</button></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header-row"><h3>Jobs Completed</h3><button className="btn btn-sm" onClick={() => navigate('/jobs')}><Plus size={12} /> New Job</button></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip />
                <Bar dataKey="jobs" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header-row"><h3>Today's Schedule</h3><button className="btn btn-sm" onClick={() => navigate('/schedule')}><Plus size={12} /> Schedule</button></div>
          <div className="schedule-list">
            {todayJobs.length === 0 && <p className="empty-text">No jobs scheduled for today.</p>}
            {todayJobs.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const assigned = team.filter(t => job.assignedTo.includes(t.id));
              return (
                <div key={job.id} className={`schedule-item priority-${job.priority} clickable`} onClick={() => navigate('/jobs')}>
                  <div className="schedule-time">{job.scheduledTime}</div>
                  <div className="schedule-info">
                    <strong>{job.title}</strong>
                    <span>{customer?.firstName} {customer?.lastName} &middot; {job.address}</span>
                  </div>
                  <div className="schedule-crew">
                    {assigned.map(t => (
                      <span key={t.id} className="crew-badge" style={{ backgroundColor: t.color }}>{t.name.split(' ').map(n => n[0]).join('')}</span>
                    ))}
                  </div>
                  <span className={`status-badge status-${job.status}`}>{job.status.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header-row"><h3>Action Items</h3></div>
          <div className="action-items">
            {overdueInvoices.length > 0 && (
              <div className="action-item warning clickable" onClick={() => navigate('/invoices')}>
                <AlertTriangle size={16} />
                <span>{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} totaling ${overdueInvoices.reduce((s, i) => s + (i.total - i.amountPaid), 0).toLocaleString()}</span>
              </div>
            )}
            {unreadMessages.length > 0 && (
              <div className="action-item info clickable" onClick={() => navigate('/messages')}>
                <Clock size={16} />
                <span>{unreadMessages.length} unread message{unreadMessages.length > 1 ? 's' : ''} awaiting response</span>
              </div>
            )}
            {pendingEstimates.length > 0 && (
              <div className="action-item clickable" onClick={() => navigate('/estimates')}>
                <FileText size={16} />
                <span>{pendingEstimates.length} estimate{pendingEstimates.length > 1 ? 's' : ''} awaiting client response</span>
              </div>
            )}
            <div className="action-item success">
              <CheckCircle2 size={16} />
              <span>Avg daily revenue ${avgDailyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} this week</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header-row"><h3>Job Pipeline</h3><button className="btn btn-sm" onClick={() => navigate('/jobs')}><Plus size={12} /> New Job</button></div>
          <div className="pipeline">
            {jobsByStatus.map(s => (
              <div key={s.name} className="pipeline-item clickable" onClick={() => navigate('/jobs')}>
                <div className="pipeline-bar" style={{ width: `${jobs.length ? (s.count / jobs.length) * 100 : 0}%`, backgroundColor: s.color }} />
                <span className="pipeline-label">{s.name}</span>
                <span className="pipeline-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header-row"><h3>Team Status</h3><button className="btn btn-sm" onClick={() => navigate('/team')}><Plus size={12} /> Add</button></div>
          <div className="team-status-list">
            {team.filter(t => t.role === 'technician').map(t => {
              const activeJob = jobs.find(j => j.id === t.activeJobId);
              return (
                <div key={t.id} className="team-status-item clickable" onClick={() => navigate('/team')}>
                  <span className="crew-badge" style={{ backgroundColor: t.color }}>{t.name.split(' ').map(n => n[0]).join('')}</span>
                  <div className="team-status-info">
                    <strong>{t.name}</strong>
                    <span>{activeJob ? activeJob.title : t.status === 'break' ? 'On break' : 'Available'}</span>
                  </div>
                  <span className={`status-dot status-${t.status}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
