import { supabase } from './supabase';

const EDGE_FN_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

async function callEdgeFunction(fnName: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${EDGE_FN_BASE}/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function createCheckoutSession(planType: string, tenantId: string) {
  return callEdgeFunction('stripe-api', { action: 'create-checkout-session', planType, tenantId });
}

export async function createBillingPortalSession(tenantId: string) {
  return callEdgeFunction('stripe-api', { action: 'create-billing-portal-session', tenantId });
}

export async function createConnectAccountLink(tenantId: string) {
  return callEdgeFunction('stripe-api', { action: 'create-connect-account-link', tenantId });
}

export async function createConnectLoginLink(tenantId: string) {
  return callEdgeFunction('stripe-api', { action: 'create-connect-login-link', tenantId });
}

export async function createPaymentIntent(invoiceId: string, amount: number, paymentMethodType: 'card' | 'us_bank_account') {
  return callEdgeFunction('stripe-api', { action: 'create-payment-intent', invoiceId, amount, paymentMethodType });
}

export async function getConnectAccountStatus(tenantId: string) {
  return callEdgeFunction('stripe-api', { action: 'get-connect-account-status', tenantId });
}
