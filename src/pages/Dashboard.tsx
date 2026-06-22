import { useApp } from '../context/AppContext';
import { dailyStats } from '../data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, Briefcase, Users, FileText, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const { jobs, customers, invoices, estimates, messages, team } = useApp();

  const todayJobs = jobs.filter(j => j.scheduledDate === '2026-06-21');
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const pendingEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'viewed');
  const unreadMessages = messages.filter(m => !m.read && m.direction === 'inbound');
  const totalRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = totalRevenue / dailyStats.length;

  const chartData = dailyStats.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    revenue: d.revenue,
    jobs: d.jobsCompleted,
  }));

  const jobsByStatus = [
    { name: 'Scheduled', count: jobs.filter(j => j.status === 'scheduled').length, color: '#3B82F6' },
    { name: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length, color: '#F59E0B' },
    { name: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: '#10B981' },
    { name: 'On Hold', count: jobs.filter(j => j.status === 'on_hold').length, color: '#6B7280' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="page-date">{format(new Date(2026, 5, 21), 'EEEE, MMMM d, yyyy')}</span>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><DollarSign size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">${totalRevenue.toLocaleString()}</span>
            <span className="kpi-label">Weekly Revenue</span>
          </div>
          <div className="kpi-trend up"><TrendingUp size={14} /> 12%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><Briefcase size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{todayJobs.length}</span>
            <span className="kpi-label">Today's Jobs</span>
          </div>
          <div className="kpi-badge">{activeJobs.length} active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple"><Users size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{customers.length}</span>
            <span className="kpi-label">Total Customers</span>
          </div>
          <div className="kpi-trend up"><TrendingUp size={14} /> 3 new</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange"><FileText size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{pendingEstimates.length}</span>
            <span className="kpi-label">Pending Estimates</span>
          </div>
          <div className="kpi-badge">${pendingEstimates.reduce((s, e) => s + e.total, 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card chart-card">
          <h3>Revenue This Week</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3>Jobs Completed</h3>
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
          <h3>Today's Schedule</h3>
          <div className="schedule-list">
            {todayJobs.length === 0 && <p className="empty-text">No jobs scheduled for today.</p>}
            {todayJobs.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const assigned = team.filter(t => job.assignedTo.includes(t.id));
              return (
                <div key={job.id} className={`schedule-item priority-${job.priority}`}>
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
          <h3>Action Items</h3>
          <div className="action-items">
            {overdueInvoices.length > 0 && (
              <div className="action-item warning">
                <AlertTriangle size={16} />
                <span>{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} totaling ${overdueInvoices.reduce((s, i) => s + (i.total - i.amountPaid), 0).toLocaleString()}</span>
              </div>
            )}
            {unreadMessages.length > 0 && (
              <div className="action-item info">
                <Clock size={16} />
                <span>{unreadMessages.length} unread message{unreadMessages.length > 1 ? 's' : ''} awaiting response</span>
              </div>
            )}
            {pendingEstimates.length > 0 && (
              <div className="action-item">
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
          <h3>Job Pipeline</h3>
          <div className="pipeline">
            {jobsByStatus.map(s => (
              <div key={s.name} className="pipeline-item">
                <div className="pipeline-bar" style={{ width: `${(s.count / jobs.length) * 100}%`, backgroundColor: s.color }} />
                <span className="pipeline-label">{s.name}</span>
                <span className="pipeline-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Team Status</h3>
          <div className="team-status-list">
            {team.filter(t => t.role === 'technician').map(t => {
              const activeJob = jobs.find(j => j.id === t.activeJobId);
              return (
                <div key={t.id} className="team-status-item">
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
