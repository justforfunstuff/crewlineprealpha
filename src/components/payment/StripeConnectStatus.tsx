import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createConnectAccountLink, createConnectLoginLink } from '../../lib/api';
import { CreditCard, ExternalLink, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { showToast } from '../Toast';

export default function StripeConnectStatus() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!tenant) return null;

  const isOnboarded = tenant.stripe_connect_onboarded;
  const hasAccount = !!tenant.stripe_connect_account_id;

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { url } = await createConnectAccountLink(tenant.id);
      window.location.href = url;
    } catch (err) {
      showToast('error', (err as Error).message);
      setLoading(false);
    }
  };

  const handleViewDashboard = async () => {
    setLoading(true);
    try {
      const { url } = await createConnectLoginLink(tenant.id);
      window.open(url, '_blank');
    } catch (err) {
      showToast('error', (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="connect-status-card">
      <div className="connect-header">
        <CreditCard size={20} />
        <h4>Payment Processing</h4>
      </div>

      {isOnboarded ? (
        <div className="connect-body">
          <div className="connect-status-row success">
            <CheckCircle2 size={16} />
            <span>Stripe account connected — you can accept payments</span>
          </div>
          <button className="btn btn-sm" onClick={handleViewDashboard} disabled={loading}>
            <ExternalLink size={14} /> View Stripe Dashboard
          </button>
        </div>
      ) : hasAccount ? (
        <div className="connect-body">
          <div className="connect-status-row warning">
            <AlertTriangle size={16} />
            <span>Stripe onboarding incomplete — finish setup to accept payments</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleConnect} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : 'Complete Setup'}
          </button>
        </div>
      ) : (
        <div className="connect-body">
          <p className="connect-description">Connect your Stripe account to accept credit card and ACH payments from your customers.</p>
          <div className="connect-fee-disclosure">
            <strong>Transparent pricing:</strong>
            <ul>
              <li>Credit card: 2.9% + 30¢ (Stripe) + 0.25% (Crewline)</li>
              <li>ACH bank transfer: 0.8% capped at $5 (Stripe) + 0.25% (Crewline)</li>
            </ul>
          </div>
          <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : <><CreditCard size={14} /> Connect Stripe Account</>}
          </button>
        </div>
      )}
    </div>
  );
}
