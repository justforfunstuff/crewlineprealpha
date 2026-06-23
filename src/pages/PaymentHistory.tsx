import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, Download, CreditCard, Building2 } from 'lucide-react';
import { showToast } from '../components/Toast';
import FeeBreakdown from '../components/payment/FeeBreakdown';
import type { Payment } from '../types';

export default function PaymentHistory() {
  const { tenant } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!tenant) return;
    supabase.from('payments').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setPayments(data as Payment[]);
      setLoading(false);
    });
  }, [tenant]);

  const filtered = payments.filter(p =>
    `${p.customer_name || ''} ${p.customer_email || ''} ${p.stripe_payment_intent_id}`.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    collected: payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
    fees: payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.processing_fee + p.platform_fee, 0),
    net: payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.net_amount, 0),
  };

  const handleExport = () => {
    const headers = ['Date', 'Customer', 'Amount', 'Stripe Fee', 'Crewline Fee', 'Net', 'Method', 'Status'];
    const rows = filtered.map(p => [new Date(p.created_at).toLocaleDateString(), p.customer_name || '', `$${p.amount.toFixed(2)}`, `$${p.processing_fee.toFixed(2)}`, `$${p.platform_fee.toFixed(2)}`, `$${p.net_amount.toFixed(2)}`, p.payment_method_type, p.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `crewline-payments-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    showToast('success', 'Payment history exported');
  };

  return (
    <div className="payments-page">
      <div className="page-header">
        <h1>Payment History</h1>
        <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
      </div>

      <div className="invoice-summary-bar">
        <div className="summary-card"><CreditCard size={18} className="text-blue" /><div><span className="summary-value">${totals.collected.toLocaleString()}</span><span className="summary-label">Total Collected</span></div></div>
        <div className="summary-card warning"><Building2 size={18} className="text-orange" /><div><span className="summary-value">${totals.fees.toLocaleString()}</span><span className="summary-label">Total Fees</span></div></div>
        <div className="summary-card success"><CreditCard size={18} className="text-green" /><div><span className="summary-value">${totals.net.toLocaleString()}</span><span className="summary-label">Net Received</span></div></div>
      </div>

      <div className="toolbar">
        <div className="search-box"><Search size={16} /><input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="card">
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Stripe Fee</th><th>Crewline Fee</th><th>Net</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="empty-text">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="empty-text">No payments yet. Payments will appear here when your customers pay invoices online.</td></tr>}
            {filtered.map(p => (
              <tr key={p.id} onClick={() => setSelectedPayment(selectedPayment?.id === p.id ? null : p)} style={{ cursor: 'pointer' }}>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                <td><strong>{p.customer_name || '—'}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-light)' }}>{p.customer_email || ''}</span></td>
                <td>${p.amount.toFixed(2)}</td>
                <td style={{ color: 'var(--danger)' }}>-${p.processing_fee.toFixed(2)}</td>
                <td style={{ color: 'var(--warning)' }}>-${p.platform_fee.toFixed(2)}</td>
                <td style={{ fontWeight: 600 }}>${p.net_amount.toFixed(2)}</td>
                <td>{p.payment_method_type === 'card' ? 'Card' : 'ACH'}</td>
                <td><span className={`status-badge status-${p.status === 'succeeded' ? 'completed' : p.status === 'failed' ? 'cancelled' : 'scheduled'}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
