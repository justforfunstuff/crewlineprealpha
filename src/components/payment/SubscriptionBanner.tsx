import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export default function SubscriptionBanner() {
  const { tenant } = useAuth();
  const navigate = useNavigate();

  if (!tenant) return null;

  const status = tenant.subscription_status;

  if (status === 'active' || status === 'none') return null;

  const config: Record<string, { icon: typeof AlertTriangle; message: string; className: string; action: string }> = {
    trialing: { icon: Clock, message: `Your free trial ends soon. Choose a plan to continue using Crewline.`, className: 'banner-info', action: 'Select a Plan' },
    past_due: { icon: AlertTriangle, message: 'Your payment is past due. Please update your billing information to avoid service interruption.', className: 'banner-warning', action: 'Update Billing' },
    cancelled: { icon: AlertTriangle, message: 'Your subscription has been cancelled. Resubscribe to restore full access.', className: 'banner-danger', action: 'Resubscribe' },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <div className={`subscription-banner ${c.className}`}>
      <c.icon size={16} />
      <span>{c.message}</span>
      <button className="btn btn-sm" onClick={() => navigate(status === 'trialing' ? '/pricing' : '/settings')}>
        {c.action} <ArrowRight size={14} />
      </button>
    </div>
  );
}
