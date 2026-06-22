import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Shield } from 'lucide-react';
import { showToast } from '../../components/Toast';
import type { Profile, UserRole, Tenant } from '../../types';

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<(Profile & { tenant_name?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [profRes, tenantRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('tenants').select('id, name'),
      ]);
      const tenantMap: Record<string, string> = {};
      (tenantRes.data as Tenant[] || []).forEach(t => { tenantMap[t.id] = t.name; });

      if (profRes.data) {
        setProfiles((profRes.data as Profile[]).map(p => ({
          ...p,
          tenant_name: p.tenant_id ? tenantMap[p.tenant_id] || 'Unknown' : '—',
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = profiles.filter(p => {
    const matchesSearch = `${p.full_name} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleChangeRole = async (profileId: string, newRole: UserRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    if (error) { showToast('error', error.message); return; }
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    showToast('success', `Role updated to ${newRole.replace('_', ' ')}`);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Users</h1>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="status-filters">
          {(['all', 'crewline_admin', 'business_owner', 'business_member'] as const).map(r => (
            <button key={r} className={`filter-chip ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'All' : r.replace(/_/g, ' ')}
              {r !== 'all' && <span className="chip-count">{profiles.filter(p => p.role === r).length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Business</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="empty-text">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="empty-text">No users found.</td></tr>}
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="crew-badge" style={{ backgroundColor: p.color || '#3B82F6', width: 28, height: 28, fontSize: 10 }}>
                      {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <strong>{p.full_name}</strong>
                    {p.role === 'crewline_admin' && <Shield size={12} style={{ color: 'var(--purple)' }} />}
                  </div>
                </td>
                <td>{p.email}</td>
                <td><span style={{ textTransform: 'capitalize' }}>{p.role.replace(/_/g, ' ')}</span></td>
                <td>{p.tenant_name}</td>
                <td><span className={`status-badge status-${p.status}`}>{p.status}</span></td>
                <td>
                  <select className="reassign-select" value={p.role} onChange={e => handleChangeRole(p.id, e.target.value as UserRole)}>
                    <option value="business_member">Business Member</option>
                    <option value="business_owner">Business Owner</option>
                    <option value="crewline_admin">Crewline Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
