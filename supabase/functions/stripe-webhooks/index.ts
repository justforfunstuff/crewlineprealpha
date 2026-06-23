import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-04-10" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const tenantId = session.metadata?.tenant_id;
        if (!tenantId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price.id;

        let planType = "monthly";
        const priceMonthly = Deno.env.get("STRIPE_PRICE_MONTHLY");
        const priceYearly = Deno.env.get("STRIPE_PRICE_YEARLY");
        const priceAnnual = Deno.env.get("STRIPE_PRICE_ANNUAL");
        if (priceId === priceYearly) planType = "yearly";
        else if (priceId === priceAnnual) planType = "annual_upfront";

        await supabase.from("tenants").update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
          subscription_plan: planType,
          plan: "pro",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq("id", tenantId);

        await supabase.from("subscription_events").insert({
          tenant_id: tenantId,
          event_type: "created",
          stripe_event_id: event.id,
          metadata: { plan: planType, subscription_id: session.subscription },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const tenantId = sub.metadata?.tenant_id;
        if (!tenantId) break;

        await supabase.from("tenants").update({
          subscription_status: "active",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", tenantId);

        await supabase.from("subscription_events").insert({
          tenant_id: tenantId,
          event_type: "renewed",
          stripe_event_id: event.id,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const tenantId = sub.metadata?.tenant_id;
        if (!tenantId) break;

        await supabase.from("tenants").update({ subscription_status: "past_due" }).eq("id", tenantId);

        await supabase.from("subscription_events").insert({
          tenant_id: tenantId,
          event_type: "payment_failed",
          stripe_event_id: event.id,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        const statusMap: Record<string, string> = {
          active: "active", past_due: "past_due", canceled: "cancelled",
          trialing: "trialing", unpaid: "past_due", incomplete: "none",
        };

        await supabase.from("tenants").update({
          subscription_status: statusMap[subscription.status] || subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }).eq("id", tenantId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        await supabase.from("tenants").update({
          subscription_status: "cancelled",
          plan: "free",
          stripe_subscription_id: null,
        }).eq("id", tenantId);

        await supabase.from("subscription_events").insert({
          tenant_id: tenantId,
          event_type: "cancelled",
          stripe_event_id: event.id,
        });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
