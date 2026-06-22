import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Building2, Users, Briefcase, DollarSign, FileText, Receipt, Edit2 } from 'lucide-react';
import { showToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import type { Tenant, Profile, TenantPlan, TenantStatus } from '../../types';

export default function AdminBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ customers: 0, jobs: 0, estimates: 0, invoices: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', plan: 'free' as TenantPlan, status: 'active' as TenantStatus });

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [tenantRes, membersRes, custCount, jobCount, estCount, invRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('tenant_id', id),
        supabase.from('customers').select('id', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('jobs').select('id', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('estimates').select('id', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('invoices').select('total, amount_paid, status').eq('tenant_id', id),
      ]);

      if (tenantRes.data) {
        const t = tenantRes.data as Tenant;
        setTenant(t);
        setEditForm({ name: t.name, plan: t.plan, status: t.status });
      }
      if (membersRes.data) setMembers(membersRes.data as Profile[]);

      const revenue = invRes.data?.filter((i: { status: string }) => i.status === 'paid').reduce((s: number, i: { total: number }) => s + Number(i.total), 0) || 0;
      setStats({
        customers: custCount.count || 0,
        jobs: jobCount.count || 0,
        estimates: estCount.count || 0,
        invoices: invRes.data?.length || 0,
        revenue,
      });
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleSaveEdit = async () => {
    if (!id) return;
    const { error } = await supabase.from('tenants').update(editForm).eq('id', id);
    if (error) { showToast('error', error.message); return; }
    setTenant(prev => prev ? { ...prev, ...editForm } : prev);
    setShowEditModal(false);
    showToast('success', 'Business updated');
  };

  const handleSuspend = async () => {
    if (!id || !tenant) return;
    const newStatus: TenantStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    await supabase.from('tenants').update({ status: newStatus }).eq('id', id);
    setTenant(prev => prev ? { ...prev, status: newStatus } : prev);
    showToast('success', `Business ${newStatus}`);
  };

  if (loading) return <div className="admin-page"><p className="empty-text">Loading...</p></div>;
  if (!tenant) return <div className="admin-page"><p className="empty-text">Business not found.</p></div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <button className="btn btn-sm" onClick={() => navigate('/admin/businesses')}><ArrowLeft size={14} /> Back</button>
        <h1>{tenant.name}</h1>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => setShowEditModal(true)}><Edit2 size={14} /> Edit</button>
          <button className={`btn btn-sm ${tenant.status === 'suspended' ? 'btn-success' : 'btn-danger'}`} onClick={handleSuspend}>
            {tenant.status === 'suspended' ? 'Reactivate' : 'Suspend'}
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-icon blue"><Users size={22} /></div><div className="kpi-content"><span className="kpi-value">{members.length}</span><span className="kpi-label">Team Members</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><Briefcase size={22} /></div><div className="kpi-content"><span className="kpi-value">{stats.jobs}</span><span className="kpi-label">Jobs</span></div></div>
        <div className="kpi-card"><div className="kpi-icon purple"><Building2 size={22} /></div><div className="kpi-content"><span className="kpi-value">{stats.customers}</span><span className="kpi-label">Customers</span></div></div>
        <div className="kpi-card"><div className="kpi-icon orange"><DollarSign size={22} /></div><div className="kpi-content"><span className="kpi-value">${stats.revenue.toLocaleString()}</span><span className="kpi-label">Revenue</span></div></div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Business Details</h3>
          <div className="detail-section contact-info">
            <div className="info-row"><Building2 size={14} /><span>Slug: {tenant.slug}</span></div>
            <div className="info-row"><FileText size={14} /><span>Plan: {tenant.plan}</span></div>
            <div className="info-row"><Receipt size={14} /><span>Status: {tenant.status}</span></div>
            <div className="info-row"><span>Created: {new Date(tenant.created_at).toLocaleDateString()}</span></div>
            {tenant.email && <div className="info-row"><span>Email: {tenant.email}</span></div>}
            {tenant.phone && <div className="info-row"><span>Phone: {tenant.phone}</span></div>}
          </div>
        </div>

        <div className="card">
          <h3>Team Members</h3>
          <div className="history-list">
            {members.length === 0 && <p className="empty-text">No team members.</p>}
            {members.map(m => (
              <div key={m.id} className="history-item">
                <div className="crew-badge" style={{ backgroundColor: m.color || '#3B82F6' }}>
                  {m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <strong>{m.full_name}</strong>
                  <span>{m.email} &middot; {m.role}</span>
                </div>
                <span className={`status-badge status-${m.status}`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Data Summary</h3>
          <div className="pipeline">
            <div className="pipeline-item"><div className="pipeline-bar" style={{ width: '100%', backgroundColor: '#3B82F6' }} /><span className="pipeline-label">Customers</span><span className="pipeline-count">{stats.customers}</span></div>
            <div className="pipeline-item"><div className="pipeline-bar" style={{ width: '100%', backgroundColor: '#10B981' }} /><span className="pipeline-label">Jobs</span><span className="pipeline-count">{stats.jobs}</span></div>
            <div className="pipeline-item"><div className="pipeline-bar" style={{ width: '100%', backgroundColor: '#F59E0B' }} /><span className="pipeline-label">Estimates</span><span className="pipeline-count">{stats.estimates}</span></div>
            <div className="pipeline-item"><div className="pipeline-bar" style={{ width: '100%', backgroundColor: '#8B5CF6' }} /><span className="pipeline-label">Invoices</span><span className="pipeline-count">{stats.invoices}</span></div>
          </div>
        </div>
      </div>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Business" width="480px">
        <div className="form-grid">
          <div className="form-group full-width"><label>Business Name</label><input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label>Plan</label>
            <select value={editForm.plan} onChange={e => setEditForm(p => ({ ...p, plan: e.target.value as TenantPlan }))}>
              <option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="form-group"><label>Status</label>
            <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as TenantStatus }))}>
              <option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
