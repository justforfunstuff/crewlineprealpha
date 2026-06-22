import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { showToast } from '../../components/Toast';
import type { TenantPlan } from '../../types';

export default function AdminCreateBusiness() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    ownerEmail: '',
    plan: 'free' as TenantPlan,
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.ownerName || !form.ownerEmail) return;
    setError('');
    setLoading(true);

    const slug = form.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const tempPassword = `Crew${Date.now().toString(36)}!`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.ownerEmail,
      password: tempPassword,
      options: { data: { full_name: form.ownerName, role: 'business_owner' } },
    });

    if (authError || !authData.user) {
      setError(authError?.message || 'Failed to create user');
      setLoading(false);
      return;
    }

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: form.businessName,
        slug,
        owner_id: authData.user.id,
        email: form.ownerEmail,
        phone: form.phone || null,
        plan: form.plan,
      })
      .select()
      .single();

    if (tenantError) {
      setError(tenantError.message);
      setLoading(false);
      return;
    }

    await supabase
      .from('profiles')
      .update({ tenant_id: tenantData.id })
      .eq('id', authData.user.id);

    setLoading(false);
    showToast('success', `Business "${form.businessName}" created. Owner will receive an email invite.`);
    navigate(`/admin/businesses/${tenantData.id}`);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <button className="btn btn-sm" onClick={() => navigate('/admin/businesses')}><ArrowLeft size={14} /> Back</button>
        <h1>Create Business</h1>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleCreate}>
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-grid">
            <div className="form-group full-width">
              <label>Business Name *</label>
              <input value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Acme Plumbing" required />
            </div>
            <div className="form-group">
              <label>Owner Name *</label>
              <input value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))} placeholder="Jane Smith" required />
            </div>
            <div className="form-group">
              <label>Owner Email *</label>
              <input type="email" value={form.ownerEmail} onChange={e => setForm(p => ({ ...p, ownerEmail: e.target.value }))} placeholder="jane@acmeplumbing.com" required />
            </div>
            <div className="form-group">
              <label>Plan</label>
              <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value as TenantPlan }))}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
            <button type="button" className="btn" onClick={() => navigate('/admin/businesses')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.businessName || !form.ownerEmail}>
              {loading ? <Loader2 size={14} className="spinner" /> : 'Create Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
