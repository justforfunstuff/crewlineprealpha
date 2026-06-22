import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Building2, ChevronRight } from 'lucide-react';
import type { Tenant, TenantStatus } from '../../types';

export default function AdminBusinesses() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('tenants').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setTenants(data as Tenant[]);
      setLoading(false);
    });
  }, []);

  const filtered = tenants.filter(t => {
    const matchesSearch = `${t.name} ${t.slug} ${t.email || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Businesses</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/businesses/new')}>
          <Plus size={16} /> Create Business
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search businesses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="status-filters">
          {(['all', 'active', 'trial', 'suspended'] as const).map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== 'all' && <span className="chip-count">{tenants.filter(t => t.status === s).length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Slug</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="empty-text">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="empty-text">No businesses found.</td></tr>}
            {filtered.map(t => (
              <tr key={t.id} onClick={() => navigate(`/admin/businesses/${t.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="customer-avatar" style={{ backgroundColor: `hsl(${t.name.charCodeAt(0) * 15}, 60%, 50%)`, width: 32, height: 32, fontSize: 11 }}>
                      {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <strong>{t.name}</strong>
                  </div>
                </td>
                <td>{t.slug}</td>
                <td><span style={{ textTransform: 'capitalize' }}>{t.plan}</span></td>
                <td><span className={`status-badge status-${t.status === 'active' ? 'completed' : t.status === 'trial' ? 'scheduled' : 'cancelled'}`}>{t.status}</span></td>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td><ChevronRight size={16} style={{ color: 'var(--text-light)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
