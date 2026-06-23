import { Check, Loader2 } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: number;
  interval: 'month' | 'year';
  commitment: string;
  savings: string | null;
  featured?: boolean;
  current?: boolean;
  loading?: boolean;
  onSelect: () => void;
}

const FEATURES = [
  'Unlimited customers & jobs',
  'Estimates & invoicing',
  'Drag-and-drop scheduling',
  'Team management',
  'Dispatch & route optimization',
  'Client messaging',
  'Online booking portal',
  'Reports & analytics',
  'Payment processing',
];

export default function PricingCard({ name, price, interval, commitment, savings, featured, current, loading, onSelect }: PricingCardProps) {
  return (
    <div className={`pricing-card ${featured ? 'featured' : ''} ${current ? 'current' : ''}`}>
      {featured && <div className="pricing-badge">Most Popular</div>}
      {savings && <div className="pricing-savings">{savings}</div>}
      <h3>{name}</h3>
      <div className="pricing-price">
        <span className="price-amount">${interval === 'year' ? Math.round(price / 12) : price}</span>
        <span className="price-interval">/mo</span>
      </div>
      {interval === 'year' && <p className="price-annual">${price} billed annually</p>}
      <p className="price-commitment">{commitment}</p>
      <button className="btn btn-primary btn-lg pricing-cta" onClick={onSelect} disabled={current || loading}>
        {loading ? <Loader2 size={16} className="spinner" /> : current ? 'Current Plan' : 'Get Started'}
      </button>
      <ul className="pricing-features">
        {FEATURES.map(f => (
          <li key={f}><Check size={14} /> {f}</li>
        ))}
      </ul>
    </div>
  );
}
