import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Building2, Users, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import type { Tenant } from '../../types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [tenantRes, userRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact' }),
      ]);
      if (tenantRes.data) setTenants(tenantRes.data as Tenant[]);
      if (userRes.count != null) setUserCount(userRes.count);
      setLoading(false);
    };
    fetch();
  }, []);

  const byPlan = { free: 0, pro: 0, enterprise: 0 };
  const byStatus = { active: 0, trial: 0, suspended: 0 };
  tenants.forEach(t => {
    byPlan[t.plan] = (byPlan[t.plan] || 0) + 1;
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  });

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/businesses/new')}>
          <Plus size={16} /> Create Business
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Building2 size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{tenants.length}</span>
            <span className="kpi-label">Businesses</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><Users size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{userCount}</span>
            <span className="kpi-label">Total Users</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple"><TrendingUp size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{byStatus.active}</span>
            <span className="kpi-label">Active</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange"><TrendingUp size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{byStatus.trial}</span>
            <span className="kpi-label">On Trial</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Plan Breakdown</h3>
          <div className="pipeline">
            {Object.entries(byPlan).map(([plan, count]) => (
              <div key={plan} className="pipeline-item">
                <div className="pipeline-bar" style={{ width: `${tenants.length ? (count / tenants.length) * 100 : 0}%`, backgroundColor: plan === 'free' ? '#6B7280' : plan === 'pro' ? '#3B82F6' : '#8B5CF6' }} />
                <span className="pipeline-label" style={{ textTransform: 'capitalize' }}>{plan}</span>
                <span className="pipeline-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Recent Businesses</h3>
          <div className="history-list">
            {loading && <p className="empty-text">Loading...</p>}
            {!loading && tenants.length === 0 && <p className="empty-text">No businesses yet.</p>}
            {tenants.slice(0, 8).map(t => (
              <div key={t.id} className="history-item" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/businesses/${t.id}`)}>
                <div className="customer-avatar" style={{ backgroundColor: `hsl(${t.name.charCodeAt(0) * 15}, 60%, 50%)`, width: 32, height: 32, fontSize: 11 }}>
                  {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <strong>{t.name}</strong>
                  <span>{t.slug} &middot; {t.plan}</span>
                </div>
                <span className={`status-badge status-${t.status === 'active' ? 'completed' : t.status === 'trial' ? 'scheduled' : 'cancelled'}`}>{t.status}</span>
                <ChevronRight size={16} style={{ color: 'var(--text-light)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
