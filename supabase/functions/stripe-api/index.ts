import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-04-10" });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRICES: Record<string, string> = {
  monthly: Deno.env.get("STRIPE_PRICE_MONTHLY") || "",
  yearly: Deno.env.get("STRIPE_PRICE_YEARLY") || "",
  annual_upfront: Deno.env.get("STRIPE_PRICE_ANNUAL") || "",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getTenant(tenantId: string) {
  const { data } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  return data;
}

async function getOrCreateStripeCustomer(tenant: Record<string, unknown>) {
  if (tenant.stripe_customer_id) return tenant.stripe_customer_id as string;
  const customer = await stripe.customers.create({
    email: tenant.email as string || undefined,
    name: tenant.name as string,
    metadata: { tenant_id: tenant.id as string },
  });
  await supabase.from("tenants").update({ stripe_customer_id: customer.id }).eq("id", tenant.id);
  return customer.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();
    const origin = req.headers.get("origin") || "https://crewlinepros.com";

    if (action === "create-checkout-session") {
      const { planType, tenantId } = params;
      const tenant = await getTenant(tenantId);
      if (!tenant) throw new Error("Tenant not found");

      const customerId = await getOrCreateStripeCustomer(tenant);
      const priceId = PRICES[planType];
      if (!priceId) throw new Error("Invalid plan type");

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/settings?subscription=success`,
        cancel_url: `${origin}/pricing`,
        metadata: { tenant_id: tenantId },
        subscription_data: { metadata: { tenant_id: tenantId } },
      };

      if (planType === "yearly") {
        sessionParams.subscription_data!.cancel_at = Math.floor(Date.now() / 1000) + 365 * 86400;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create-billing-portal-session") {
      const { tenantId } = params;
      const tenant = await getTenant(tenantId);
      if (!tenant?.stripe_customer_id) throw new Error("No billing account found");

      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripe_customer_id as string,
        return_url: `${origin}/settings`,
      });
      return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create-connect-account-link") {
      const { tenantId } = params;
      const tenant = await getTenant(tenantId);
      if (!tenant) throw new Error("Tenant not found");

      let accountId = tenant.stripe_connect_account_id as string;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: tenant.email as string || undefined,
          metadata: { tenant_id: tenantId },
          capabilities: { card_payments: { requested: true }, transfers: { requested: true }, us_bank_account_ach_payments: { requested: true } },
        });
        accountId = account.id;
        await supabase.from("tenants").update({ stripe_connect_account_id: accountId }).eq("id", tenantId);
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/settings?connect=refresh`,
        return_url: `${origin}/settings?connect=success`,
        type: "account_onboarding",
      });
      return new Response(JSON.stringify({ url: link.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create-connect-login-link") {
      const { tenantId } = params;
      const tenant = await getTenant(tenantId);
      if (!tenant?.stripe_connect_account_id) throw new Error("No connected account");

      const link = await stripe.accounts.createLoginLink(tenant.stripe_connect_account_id as string);
      return new Response(JSON.stringify({ url: link.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create-payment-intent") {
      const { invoiceId, amount, paymentMethodType } = params;

      const { data: invoice } = await supabase.from("invoices").select("*, tenant_id").eq("id", invoiceId).single();
      if (!invoice) throw new Error("Invoice not found");

      const tenant = await getTenant(invoice.tenant_id);
      if (!tenant?.stripe_connect_account_id) throw new Error("Business has not set up payment processing");

      const amountCents = Math.round(amount * 100);
      const platformFeeCents = Math.round(amountCents * 0.0025);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        payment_method_types: [paymentMethodType || "card"],
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: tenant.stripe_connect_account_id as string },
        metadata: { invoice_id: invoiceId, tenant_id: invoice.tenant_id },
      });

      await supabase.from("payments").insert({
        tenant_id: invoice.tenant_id,
        invoice_id: invoiceId,
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        platform_fee: platformFeeCents / 100,
        payment_method_type: paymentMethodType || "card",
        status: "pending",
      });

      return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create-invoice-checkout") {
      const { invoiceId } = params;

      const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (!invoice) throw new Error("Invoice not found");

      const tenant = await getTenant(invoice.tenant_id);
      if (!tenant?.stripe_connect_account_id) throw new Error("Business has not set up payment processing");

      const balanceDue = Number(invoice.total) - Number(invoice.amount_paid);
      if (balanceDue <= 0) throw new Error("Invoice is already paid");

      const amountCents = Math.round(balanceDue * 100);
      const platformFeeCents = Math.round(amountCents * 0.0025);

      const { data: customer } = invoice.customer_id
        ? await supabase.from("customers").select("first_name, last_name, email").eq("id", invoice.customer_id).single()
        : { data: null };

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: `Invoice ${invoice.number}`, description: `Payment to ${tenant.name}` },
          },
          quantity: 1,
        }],
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          transfer_data: { destination: tenant.stripe_connect_account_id as string },
          metadata: { invoice_id: invoiceId, tenant_id: invoice.tenant_id as string },
        },
        customer_email: customer?.email || undefined,
        success_url: `${origin}/pay/${invoiceId}?success=true`,
        cancel_url: `${origin}/pay/${invoiceId}`,
        metadata: { invoice_id: invoiceId, tenant_id: invoice.tenant_id as string },
      });

      return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get-connect-account-status") {
      const { tenantId } = params;
      const tenant = await getTenant(tenantId);
      if (!tenant?.stripe_connect_account_id) return new Response(JSON.stringify({ onboarded: false, hasAccount: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const account = await stripe.accounts.retrieve(tenant.stripe_connect_account_id as string);
      const onboarded = account.charges_enabled && account.payouts_enabled;

      if (onboarded && !tenant.stripe_connect_onboarded) {
        await supabase.from("tenants").update({ stripe_connect_onboarded: true }).eq("id", tenantId);
      }

      return new Response(JSON.stringify({ onboarded, hasAccount: true, chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
