import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBillingPortalSession, createCheckoutSession } from '../lib/api';
import { showToast } from '../components/Toast';
import StripeConnectStatus from '../components/payment/StripeConnectStatus';
import Modal from '../components/Modal';
import PricingCard from '../components/payment/PricingCard';
import { CreditCard, FileText, Shield, ExternalLink, Loader2, Info } from 'lucide-react';
import { PLANS, type PlanId } from '../lib/stripe';

export default function Settings() {
  const { tenant, profile } = useAuth();
  const [billingLoading, setBillingLoading] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!tenant) return;
    setLoadingPlan(planId);
    try {
      const { url } = await createCheckoutSession(planId, tenant.id);
      window.location.href = url;
    } catch (err) {
      showToast('error', (err as Error).message);
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    if (!tenant) return;
    setBillingLoading(true);
    try {
      const { url } = await createBillingPortalSession(tenant.id);
      window.location.href = url;
    } catch (err) {
      showToast('error', (err as Error).message);
      setBillingLoading(false);
    }
  };

  const currentPlan = tenant?.subscription_plan ? PLANS[tenant.subscription_plan as keyof typeof PLANS] : null;

  return (
    <div className="settings-page">
      <div className="page-header"><h1>Settings</h1></div>

      <div className="settings-grid">
        <div className="card settings-section">
          <h3><FileText size={18} /> Subscription</h3>
          {tenant?.subscription_status === 'active' && currentPlan ? (
            <div className="subscription-info">
              <div className="sub-detail"><span className="sub-label">Current Plan</span><span className="sub-value">{currentPlan.name}</span></div>
              <div className="sub-detail"><span className="sub-label">Price</span><span className="sub-value">${currentPlan.price}/{currentPlan.interval}</span></div>
              <div className="sub-detail"><span className="sub-label">Status</span><span className={`status-badge status-completed`}>Active</span></div>
              {tenant.current_period_end && <div className="sub-detail"><span className="sub-label">Next Billing</span><span className="sub-value">{new Date(tenant.current_period_end).toLocaleDateString()}</span></div>}
              <button className="btn" onClick={handleManageBilling} disabled={billingLoading}>
                {billingLoading ? <Loader2 size={14} className="spinner" /> : <><ExternalLink size={14} /> Manage Subscription</>}
              </button>
            </div>
          ) : (
            <div className="subscription-info">
              <p>You're on the <strong>Free</strong> plan.</p>
              <button className="btn btn-primary" onClick={() => setShowPricing(true)}>Upgrade Your Plan</button>
            </div>
          )}
        </div>

        <div className="card settings-section">
          <h3><CreditCard size={18} /> Payment Processing</h3>
          <StripeConnectStatus />
        </div>

        <div className="card settings-section">
          <h3><Shield size={18} /> Fee Transparency</h3>
          <div className="fee-transparency">
            <div className="fee-disclosure-card">
              <h4>Subscription Fees</h4>
              <table className="fee-table">
                <tbody>
                  <tr><td>Month-to-Month</td><td>$39/mo</td></tr>
                  <tr><td>Yearly Contract</td><td>$35/mo (12-month commitment)</td></tr>
                  <tr><td>Year Upfront</td><td>$360/yr ($30/mo effective)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="fee-disclosure-card">
              <h4>Payment Processing Fees</h4>
              <p className="fee-note"><Info size={14} /> These fees apply when your customers pay invoices through Crewline.</p>
              <table className="fee-table">
                <thead><tr><th>Method</th><th>Stripe Fee</th><th>Crewline Fee</th></tr></thead>
                <tbody>
                  <tr><td>Credit/Debit Card</td><td>2.9% + 30¢</td><td>0.25%</td></tr>
                  <tr><td>ACH Bank Transfer</td><td>0.8% (max $5)</td><td>0.25%</td></tr>
                  <tr><td>Cash / Check</td><td>—</td><td>—</td></tr>
                </tbody>
              </table>
              <p className="fee-example">
                <strong>Example:</strong> On a $1,000 credit card payment, Stripe receives $29.30, Crewline receives $2.50, and you receive $968.20.
              </p>
            </div>
          </div>
        </div>

        <div className="card settings-section">
          <h3>Business Profile</h3>
          <div className="subscription-info">
            <div className="sub-detail"><span className="sub-label">Business Name</span><span className="sub-value">{tenant?.name || '—'}</span></div>
            <div className="sub-detail"><span className="sub-label">Owner</span><span className="sub-value">{profile?.full_name || '—'}</span></div>
            <div className="sub-detail"><span className="sub-label">Email</span><span className="sub-value">{profile?.email || '—'}</span></div>
          </div>
        </div>
      </div>

      <Modal open={showPricing} onClose={() => setShowPricing(false)} title="Choose Your Plan" width="900px">
        <div className="pricing-grid" style={{ padding: '16px 0' }}>
          {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, plan]) => (
            <PricingCard key={id} name={plan.name} price={plan.price} interval={plan.interval} commitment={plan.commitment} savings={plan.savings} featured={id === 'yearly'} current={tenant?.subscription_plan === id} loading={loadingPlan === id} onSelect={() => handleSelectPlan(id)} />
          ))}
        </div>
      </Modal>
    </div>
  );
}
