import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Clock, DollarSign, User, MapPin, ChevronDown, ChevronUp, CheckCircle2, Play, Pause, XCircle, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import type { JobStatus, JobPriority, LineItem } from '../types';

const STATUS_OPTIONS: { value: JobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Jobs' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'on_hold', label: 'On Hold' }, { value: 'cancelled', label: 'Cancelled' },
];

export default function Jobs() {
  const { jobs, customers, team, updateJob, setJobs } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [expandedJob, setExpandedJob] = useState<string | null>('j2');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ title: '', description: '', customerId: '', assignedTo: [] as string[], priority: 'medium' as JobPriority, scheduledDate: '2026-06-25', scheduledTime: '09:00', estimatedDuration: 2, address: '', city: '', notes: '' });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 'new1', description: '', quantity: 1, unitPrice: 0 }]);

  const filtered = jobs
    .filter(j => {
      const customer = customers.find(c => c.id === j.customerId);
      const matchesSearch = `${j.title} ${customer?.firstName} ${customer?.lastName} ${j.description}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const order: Record<JobStatus, number> = { in_progress: 0, scheduled: 1, on_hold: 2, completed: 3, cancelled: 4 };
      return order[a.status] - order[b.status] || new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });

  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    updateJob(jobId, { status: newStatus, ...(newStatus === 'completed' ? { completedAt: '2026-06-21' } : {}) });
    showToast('success', `Job ${newStatus.replace('_', ' ')}`);
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: `new${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }]);
  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));

  const toggleAssigned = (techId: string) => {
    setForm(prev => ({ ...prev, assignedTo: prev.assignedTo.includes(techId) ? prev.assignedTo.filter(id => id !== techId) : [...prev.assignedTo, techId] }));
  };

  const handleCreate = () => {
    if (!form.title || !form.customerId) return;
    const customer = customers.find(c => c.id === form.customerId);
    const total = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const newJob = {
      id: `j${Date.now()}`,
      ...form,
      address: form.address || customer?.address || '',
      city: form.city || customer?.city || '',
      status: 'scheduled' as JobStatus,
      lineItems: lineItems.filter(li => li.description),
      totalAmount: total,
      photos: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setJobs(prev => [...prev, newJob]);
    setShowModal(false);
    setForm({ title: '', description: '', customerId: '', assignedTo: [], priority: 'medium', scheduledDate: '2026-06-25', scheduledTime: '09:00', estimatedDuration: 2, address: '', city: '', notes: '' });
    setLineItems([{ id: 'new1', description: '', quantity: 1, unitPrice: 0 }]);
    setExpandedJob(newJob.id);
    showToast('success', `Job "${newJob.title}" created`);
  };

  const techs = team.filter(t => t.role === 'technician');

  return (
    <div className="jobs-page">
      <div className="page-header">
        <h1>Jobs</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Job</button>
      </div>

      <div className="toolbar">
        <div className="search-box"><Search size={16} /><input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="status-filters">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} className={`filter-chip ${statusFilter === opt.value ? 'active' : ''}`} onClick={() => setStatusFilter(opt.value)}>
              {opt.label}
              {opt.value !== 'all' && <span className="chip-count">{jobs.filter(j => j.status === opt.value).length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="jobs-list">
        {filtered.map(job => {
          const customer = customers.find(c => c.id === job.customerId);
          const assigned = team.filter(t => job.assignedTo.includes(t.id));
          const isExpanded = expandedJob === job.id;
          return (
            <div key={job.id} className={`job-card ${isExpanded ? 'expanded' : ''}`}>
              <div className="job-card-header" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                <div className={`priority-indicator priority-${job.priority}`} />
                <div className="job-main-info">
                  <h3>{job.title}</h3>
                  <div className="job-meta">
                    <span><User size={13} /> {customer?.firstName} {customer?.lastName}</span>
                    <span><Clock size={13} /> {job.scheduledDate} at {job.scheduledTime}</span>
                    <span><MapPin size={13} /> {job.city}</span>
                    <span><DollarSign size={13} /> ${job.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="job-card-right">
                  <div className="crew-badges">{assigned.map(t => <span key={t.id} className="crew-badge" style={{ backgroundColor: t.color }}>{t.name.split(' ').map(n => n[0]).join('')}</span>)}</div>
                  <span className={`status-badge status-${job.status}`}>{job.status.replace('_', ' ')}</span>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
              {isExpanded && (
                <div className="job-card-body">
                  <div className="job-detail-grid">
                    <div className="job-detail-section"><h4>Description</h4><p>{job.description || 'No description.'}</p>{job.notes && <><h4>Notes</h4><p>{job.notes}</p></>}</div>
                    <div className="job-detail-section">
                      <h4>Line Items</h4>
                      <table className="line-items-table">
                        <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                        <tbody>{job.lineItems.map(li => (
                          <tr key={li.id} className={li.optional ? 'optional' : ''}><td>{li.description} {li.optional && <span className="optional-badge">Optional</span>}</td><td>{li.quantity}</td><td>${li.unitPrice.toFixed(2)}</td><td>${(li.quantity * li.unitPrice).toFixed(2)}</td></tr>
                        ))}</tbody>
                        <tfoot><tr><td colSpan={3}><strong>Total</strong></td><td><strong>${job.totalAmount.toLocaleString()}</strong></td></tr></tfoot>
                      </table>
                    </div>
                    <div className="job-detail-section"><h4>Duration</h4><p>Estimated: {job.estimatedDuration}h {job.actualDuration ? `| Actual: ${job.actualDuration}h` : ''}</p></div>
                  </div>
                  <div className="job-actions">
                    {job.status === 'scheduled' && <button className="btn btn-success" onClick={() => handleStatusChange(job.id, 'in_progress')}><Play size={14} /> Start Job</button>}
                    {job.status === 'in_progress' && (<><button className="btn btn-success" onClick={() => handleStatusChange(job.id, 'completed')}><CheckCircle2 size={14} /> Complete</button><button className="btn btn-warning" onClick={() => handleStatusChange(job.id, 'on_hold')}><Pause size={14} /> Hold</button></>)}
                    {job.status === 'on_hold' && <button className="btn btn-primary" onClick={() => handleStatusChange(job.id, 'in_progress')}><Play size={14} /> Resume</button>}
                    {job.status !== 'completed' && job.status !== 'cancelled' && <button className="btn btn-danger" onClick={() => handleStatusChange(job.id, 'cancelled')}><XCircle size={14} /> Cancel</button>}
                    <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => { setJobs(prev => prev.filter(j => j.id !== job.id)); setExpandedJob(null); showToast('info', 'Job deleted'); }}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="empty-text">No jobs match your filters.</p>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Job" width="680px">
        <div className="form-grid">
          <div className="form-group full-width"><label>Job Title *</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Water Heater Replacement" /></div>
          <div className="form-group"><label>Customer *</label>
            <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Priority</label>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as JobPriority }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group"><label>Date</label><input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
          <div className="form-group"><label>Time</label><input type="time" value={form.scheduledTime} onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))} /></div>
          <div className="form-group"><label>Est. Duration (hrs)</label><input type="number" min="0.5" step="0.5" value={form.estimatedDuration} onChange={e => setForm(p => ({ ...p, estimatedDuration: parseFloat(e.target.value) || 1 }))} /></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Or uses customer address" /></div>
          <div className="form-group full-width">
            <label>Assign Technicians</label>
            <div className="tech-picker">{techs.map(t => (
              <button key={t.id} type="button" className={`tech-chip ${form.assignedTo.includes(t.id) ? 'active' : ''}`} style={form.assignedTo.includes(t.id) ? { backgroundColor: t.color, color: '#fff', borderColor: t.color } : {}} onClick={() => toggleAssigned(t.id)}>
                {t.name}
              </button>
            ))}</div>
          </div>
          <div className="form-group full-width"><label>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Job description..." /></div>
          <div className="form-group full-width">
            <label>Line Items</label>
            <table className="line-items-table editable">
              <thead><tr><th>Description</th><th style={{width:60}}>Qty</th><th style={{width:90}}>Price</th><th style={{width:40}}></th></tr></thead>
              <tbody>
                {lineItems.map(li => (
                  <tr key={li.id}>
                    <td><input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td><input type="number" min="1" value={li.quantity} onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 1)} /></td>
                    <td><input type="number" min="0" step="0.01" value={li.unitPrice} onChange={e => updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                    <td><button className="btn-icon" onClick={() => removeLineItem(li.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-sm" onClick={addLineItem} style={{ marginTop: 6 }}><Plus size={12} /> Add Item</button>
            <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 8 }}>Total: ${lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0).toFixed(2)}</div>
          </div>
          <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Internal notes..." /></div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!form.title || !form.customerId}>Create Job</button>
        </div>
      </Modal>
    </div>
  );
}
