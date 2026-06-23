import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Zap, CheckCircle2, Loader2, CreditCard, Building2 } from 'lucide-react';

export default function InvoicePayment() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null);
  const [customer, setCustomer] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    const fetch = async () => {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
      if (!inv) { setLoading(false); return; }
      setInvoice(inv);

      const [tenantRes, custRes] = await Promise.all([
        supabase.from('tenants').select('name, slug, email, phone').eq('id', inv.tenant_id).single(),
        inv.customer_id ? supabase.from('customers').select('first_name, last_name, email').eq('id', inv.customer_id).single() : Promise.resolve({ data: null }),
      ]);
      if (tenantRes.data) setTenant(tenantRes.data);
      if (custRes.data) setCustomer(custRes.data);
      if (inv.status === 'paid') setPaid(true);
      setLoading(false);
    };
    fetch();
  }, [invoiceId]);

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const EDGE_FN_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
      const res = await window.fetch(`${EDGE_FN_BASE}/stripe-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-invoice-checkout', invoiceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Payment setup failed');
        setPaying(false);
      }
    } catch {
      setError('Unable to process payment. Please try again.');
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="auth-page"><div className="auth-card" style={{ textAlign: 'center' }}><Loader2 size={32} className="spinner" /><p>Loading invoice...</p></div></div>;
  }

  if (!invoice) {
    return <div className="auth-page"><div className="auth-card" style={{ textAlign: 'center' }}><h2>Invoice not found</h2><p className="auth-subtitle">This invoice link may be invalid or expired.</p></div></div>;
  }

  const lineItems = (invoice.line_items as Array<{ description: string; quantity: number; unitPrice: number }>) || [];
  const total = Number(invoice.total) || 0;
  const amountPaid = Number(invoice.amount_paid) || 0;
  const balanceDue = total - amountPaid;

  return (
    <div className="auth-page" style={{ background: 'var(--bg)' }}>
      <div className="invoice-pay-card">
        <div className="invoice-pay-header">
          <div className="auth-logo"><Zap size={24} /><span style={{ fontSize: 16, fontWeight: 700 }}>Crewline</span></div>
          {tenant && <h2>{tenant.name as string}</h2>}
          <p className="auth-subtitle">Invoice {invoice.number as string}</p>
        </div>

        {paid ? (
          <div className="invoice-paid-state">
            <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
            <h3>Payment Received</h3>
            <p>Thank you! This invoice has been paid in full.</p>
          </div>
        ) : (
          <>
            {customer && <div className="invoice-pay-customer"><strong>Bill to:</strong> {customer.first_name as string} {customer.last_name as string}</div>}

            <table className="line-items-table">
              <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>
                {lineItems.map((li, i) => (
                  <tr key={i}><td>{li.description}</td><td>{li.quantity}</td><td>${Number(li.unitPrice).toFixed(2)}</td><td>${(li.quantity * li.unitPrice).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>

            <div className="doc-totals" style={{ marginTop: 16 }}>
              <div><span>Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span></div>
              <div><span>Tax</span><span>${Number(invoice.tax).toFixed(2)}</span></div>
              <div className="total-row"><span>Total</span><span>${total.toFixed(2)}</span></div>
              {amountPaid > 0 && <div className="paid-row"><span>Paid</span><span>-${amountPaid.toFixed(2)}</span></div>}
              <div className="balance-row"><span>Balance Due</span><span>${balanceDue.toFixed(2)}</span></div>
            </div>

            {error && <div className="auth-error" style={{ marginTop: 16 }}>{error}</div>}

            <button className="btn btn-primary btn-lg auth-submit" style={{ marginTop: 20 }} onClick={handlePay} disabled={paying || balanceDue <= 0}>
              {paying ? <Loader2 size={16} className="spinner" /> : <><CreditCard size={16} /> Pay ${balanceDue.toFixed(2)}</>}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-light)', marginTop: 12 }}>
              Secure payment powered by Stripe. Your card information never touches {tenant?.name as string || "this business"}'s servers.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
