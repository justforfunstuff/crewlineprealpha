import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export const PLANS = {
  monthly: { id: 'monthly', name: 'Month-to-Month', price: 39, interval: 'month' as const, commitment: 'Cancel anytime', savings: null },
  yearly: { id: 'yearly', name: 'Yearly Contract', price: 35, interval: 'month' as const, commitment: '12-month commitment', savings: 'Save $48/year' },
  annual_upfront: { id: 'annual_upfront', name: 'Year Upfront', price: 360, interval: 'year' as const, commitment: 'Paid annually', savings: 'Best value — $30/mo' },
} as const;

export type PlanId = keyof typeof PLANS;

export const PLATFORM_FEE_RATE = 0.0025;

export function calculateFees(amount: number, paymentMethod: 'card' | 'ach') {
  const stripeFee = paymentMethod === 'card'
    ? amount * 0.029 + 0.30
    : Math.min(amount * 0.008, 5.00);
  const platformFee = amount * PLATFORM_FEE_RATE;
  const netAmount = amount - stripeFee - platformFee;
  return { stripeFee: Math.round(stripeFee * 100) / 100, platformFee: Math.round(platformFee * 100) / 100, netAmount: Math.round(netAmount * 100) / 100 };
}
