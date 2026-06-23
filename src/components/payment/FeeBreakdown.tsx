import { calculateFees } from '../../lib/stripe';

interface FeeBreakdownProps {
  amount: number;
  paymentMethod: 'card' | 'ach';
  showPlatformFee?: boolean;
}

export default function FeeBreakdown({ amount, paymentMethod, showPlatformFee = true }: FeeBreakdownProps) {
  const { stripeFee, platformFee, netAmount } = calculateFees(amount, paymentMethod === 'ach' ? 'ach' : 'card');

  return (
    <div className="fee-breakdown">
      <div className="fee-row"><span>Invoice Amount</span><span>${amount.toFixed(2)}</span></div>
      <div className="fee-row fee-deduction"><span>Stripe Processing Fee ({paymentMethod === 'card' ? '2.9% + 30¢' : '0.8% max $5'})</span><span>-${stripeFee.toFixed(2)}</span></div>
      {showPlatformFee && <div className="fee-row fee-deduction"><span>Crewline Platform Fee (0.25%)</span><span>-${platformFee.toFixed(2)}</span></div>}
      <div className="fee-row fee-total"><span>Net to Your Account</span><span>${netAmount.toFixed(2)}</span></div>
    </div>
  );
}
