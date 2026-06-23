import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, CreditCard, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FeeRecord {
  id: string;
  tenant_id: string;
  amount: number;
  created_at: string;
  tenant_name?: string;
}

export default function AdminRevenue() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [feeRes, tenantRes] = await Promise.all([
        supabase.from('platform_fee_ledger').select('*').order('created_at', { ascending: false }),
        supabase.from('tenants').select('id, name, subscription_status, subscription_plan'),
      ]);

      const tenantMap: Record<string, string> = {};
      const activeCount = (tenantRes.data || []).filter((t: Record<string, unknown>) => t.subscription_status === 'active').length;
      (tenantRes.data || []).forEach((t: Record<string, unknown>) => { tenantMap[t.id as string] = t.name as string; });

      if (feeRes.data) {
        setFees((feeRes.data as FeeRecord[]).map(f => ({ ...f, tenant_name: tenantMap[f.tenant_id] || 'Unknown' })));
      }

      setSubscriptionRevenue(activeCount * 39);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalPlatformFees = fees.reduce((s, f) => s + f.amount, 0);
  const feesByTenant: Record<string, { name: string; total: number }> = {};
  fees.forEach(f => {
    if (!feesByTenant[f.tenant_id]) feesByTenant[f.tenant_id] = { name: f.tenant_name || 'Unknown', total: 0 };
    feesByTenant[f.tenant_id].total += f.amount;
  });
  const chartData = Object.values(feesByTenant).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="admin-page">
      <div className="page-header"><h1>Platform Revenue</h1></div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-icon blue"><DollarSign size={22} /></div><div className="kpi-content"><span className="kpi-value">${(subscriptionRevenue + totalPlatformFees).toLocaleString()}</span><span className="kpi-label">Total Revenue</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><TrendingUp size={22} /></div><div className="kpi-content"><span className="kpi-value">${subscriptionRevenue.toLocaleString()}</span><span className="kpi-label">Subscription MRR</span></div></div>
        <div className="kpi-card"><div className="kpi-icon purple"><CreditCard size={22} /></div><div className="kpi-content"><span className="kpi-value">${totalPlatformFees.toLocaleString()}</span><span className="kpi-label">Platform Fees (0.25%)</span></div></div>
        <div className="kpi-card"><div className="kpi-icon orange"><Building2 size={22} /></div><div className="kpi-content"><span className="kpi-value">{fees.length}</span><span className="kpi-label">Transactions</span></div></div>
      </div>

      <div className="dashboard-grid">
        {chartData.length > 0 && (
          <div className="card chart-card">
            <h3>Platform Fees by Business</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h3>Recent Platform Fees</h3>
          <div className="history-list">
            {loading && <p className="empty-text">Loading...</p>}
            {!loading && fees.length === 0 && <p className="empty-text">No platform fees collected yet. Fees appear when businesses process payments through Crewline.</p>}
            {fees.slice(0, 20).map(f => (
              <div key={f.id} className="history-item">
                <span className="status-dot status-completed" />
                <div><strong>${f.amount.toFixed(2)}</strong><span>{f.tenant_name} &middot; {new Date(f.created_at).toLocaleDateString()}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
