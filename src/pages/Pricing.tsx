import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PLANS, type PlanId } from '../lib/stripe';
import { createCheckoutSession } from '../lib/api';
import { showToast } from '../components/Toast';
import PricingCard from '../components/payment/PricingCard';
import { Zap, Shield, CreditCard } from 'lucide-react';

export default function Pricing() {
  const { tenant, session } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!session) {
      navigate('/signup');
      return;
    }
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

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <div className="auth-logo"><Zap size={32} /><h1>Crewline</h1></div>
        <h2>Simple, transparent pricing</h2>
        <p>Everything you need to run your service business. No hidden fees.</p>
      </div>

      <div className="pricing-grid">
        {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, plan]) => (
          <PricingCard
            key={id}
            name={plan.name}
            price={plan.price}
            interval={plan.interval}
            commitment={plan.commitment}
            savings={plan.savings}
            featured={id === 'yearly'}
            current={tenant?.subscription_plan === id}
            loading={loadingPlan === id}
            onSelect={() => handleSelectPlan(id)}
          />
        ))}
      </div>

      <div className="pricing-footer">
        <div className="pricing-trust">
          <div className="trust-item"><Shield size={16} /> <span>256-bit SSL encryption</span></div>
          <div className="trust-item"><CreditCard size={16} /> <span>Powered by Stripe</span></div>
        </div>
        <div className="pricing-fee-note">
          <p><strong>Payment processing:</strong> Accept credit card (2.9% + 30¢) and ACH (0.8%, max $5) payments from your customers. Crewline adds a 0.25% platform fee on processed payments.</p>
        </div>
      </div>

      {!session && (
        <p className="pricing-login-note">
          Already have an account? <a href="/login" className="auth-link">Sign in</a>
        </p>
      )}
    </div>
  );
}
