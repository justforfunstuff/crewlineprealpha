import { useApp } from '../context/AppContext';
import { dailyStats } from '../data/mockData';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign, Users, Briefcase, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { showToast } from '../components/Toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const { jobs, customers, invoices, estimates, team } = useApp();

  const revenueData = dailyStats.map(d => ({ date: format(parseISO(d.date), 'MMM d'), revenue: d.revenue, jobs: d.jobsCompleted, customers: d.newCustomers }));
  const jobStatusData = [
    { name: 'Completed', value: jobs.filter(j => j.status === 'completed').length },
    { name: 'In Progress', value: jobs.filter(j => j.status === 'in_progress').length },
    { name: 'Scheduled', value: jobs.filter(j => j.status === 'scheduled').length },
    { name: 'Cancelled', value: jobs.filter(j => j.status === 'cancelled').length },
  ].filter(d => d.value > 0);

  const invoiceStatusData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'paid').length },
    { name: 'Sent', value: invoices.filter(i => i.status === 'sent' || i.status === 'draft').length },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length },
    { name: 'Partial', value: invoices.filter(i => i.status === 'partial').length },
  ].filter(d => d.value > 0);

  const techPerformance = team.filter(t => t.role === 'technician').map(t => {
    const techJobs = jobs.filter(j => j.assignedTo.includes(t.id));
    const completed = techJobs.filter(j => j.status === 'completed');
    return { name: t.name.split(' ')[0], jobs: techJobs.length, completed: completed.length, revenue: completed.reduce((s, j) => s + j.totalAmount, 0) };
  });

  const customerSourceData = [
    { name: 'Referral', value: customers.filter(c => c.source === 'referral').length },
    { name: 'Website', value: customers.filter(c => c.source === 'website').length },
    { name: 'Online Booking', value: customers.filter(c => c.source === 'online_booking').length },
    { name: 'Phone', value: customers.filter(c => c.source === 'phone').length },
    { name: 'Repeat', value: customers.filter(c => c.source === 'repeat').length },
  ];

  const totalRevenue = dailyStats.reduce((s, d) => s + d.revenue, 0);
  const totalJobs = dailyStats.reduce((s, d) => s + d.jobsCompleted, 0);
  const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;
  const conversionRate = estimates.length > 0 ? estimates.filter(e => e.status === 'approved').length / estimates.length * 100 : 0;

  const handleExport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Revenue', `$${totalRevenue}`],
      ['Jobs Completed', `${totalJobs}`],
      ['Avg Job Value', `$${avgJobValue.toFixed(0)}`],
      ['Estimate Conversion', `${conversionRate.toFixed(0)}%`],
      ['Total Customers', `${customers.length}`],
      ['Outstanding Invoices', `$${invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total - i.amountPaid), 0).toFixed(2)}`],
      [''],
      ['Date', 'Revenue', 'Jobs Completed', 'New Customers'],
      ...dailyStats.map(d => [d.date, `$${d.revenue}`, `${d.jobsCompleted}`, `${d.newCustomers}`]),
      [''],
      ['Technician', 'Total Jobs', 'Completed', 'Revenue'],
      ...techPerformance.map(t => [t.name, `${t.jobs}`, `${t.completed}`, `$${t.revenue}`]),
    ];
    const csv = [headers.join(','), ...rows.map(r => Array.isArray(r) ? r.join(',') : r)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `crewline-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('success', 'Report exported as CSV');
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      <div className="kpi-grid four">
        <div className="kpi-card"><div className="kpi-icon blue"><DollarSign size={22} /></div><div className="kpi-content"><span className="kpi-value">${totalRevenue.toLocaleString()}</span><span className="kpi-label">Total Revenue</span></div><div className="kpi-trend up"><TrendingUp size={14} /> 12%</div></div>
        <div className="kpi-card"><div className="kpi-icon green"><Briefcase size={22} /></div><div className="kpi-content"><span className="kpi-value">{totalJobs}</span><span className="kpi-label">Jobs Completed</span></div><div className="kpi-trend up"><TrendingUp size={14} /> 8%</div></div>
        <div className="kpi-card"><div className="kpi-icon purple"><DollarSign size={22} /></div><div className="kpi-content"><span className="kpi-value">${avgJobValue.toFixed(0)}</span><span className="kpi-label">Avg Job Value</span></div><div className="kpi-trend down"><TrendingDown size={14} /> 3%</div></div>
        <div className="kpi-card"><div className="kpi-icon orange"><FileText size={22} /></div><div className="kpi-content"><span className="kpi-value">{conversionRate.toFixed(0)}%</span><span className="kpi-label">Estimate Conversion</span></div><div className="kpi-trend up"><TrendingUp size={14} /> 5%</div></div>
      </div>

      <div className="reports-grid">
        <div className="card chart-card span-2"><h3>Revenue Trend</h3><ResponsiveContainer width="100%" height={280}><AreaChart data={revenueData}><defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" /><XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} tickFormatter={v => `$${v}`} /><Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} /><Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#revGrad)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        <div className="card chart-card"><h3>Job Status</h3><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={jobStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{jobStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        <div className="card chart-card"><h3>Technician Performance</h3><ResponsiveContainer width="100%" height={280}><BarChart data={techPerformance}><CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} /><Bar dataKey="jobs" fill="#3B82F6" name="Total" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="card chart-card"><h3>Invoice Status</h3><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label>{invoiceStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        <div className="card chart-card"><h3>Customer Acquisition</h3><ResponsiveContainer width="100%" height={280}><BarChart data={customerSourceData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" /><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="name" fontSize={12} width={100} /><Tooltip /><Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
    </div>
  );
}
