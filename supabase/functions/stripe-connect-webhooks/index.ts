import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-04-10" });
const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")!;
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
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoice_id;
        const tenantId = pi.metadata?.tenant_id;
        if (!invoiceId || !tenantId) break;

        const charge = pi.latest_charge
          ? await stripe.charges.retrieve(pi.latest_charge as string)
          : null;

        const amount = pi.amount / 100;
        const stripeFee = charge?.balance_transaction
          ? await stripe.balanceTransactions.retrieve(charge.balance_transaction as string).then(bt => bt.fee / 100)
          : amount * 0.029 + 0.30;
        const platformFee = amount * 0.0025;
        const netAmount = amount - stripeFee - platformFee;

        await supabase.from("payments").update({
          status: "succeeded",
          stripe_charge_id: charge?.id || null,
          processing_fee: stripeFee,
          platform_fee: platformFee,
          net_amount: netAmount,
          completed_at: new Date().toISOString(),
        }).eq("stripe_payment_intent_id", pi.id);

        const { data: invoice } = await supabase.from("invoices").select("total, amount_paid").eq("id", invoiceId).single();
        if (invoice) {
          const newPaid = Number(invoice.amount_paid) + amount;
          const newStatus = newPaid >= Number(invoice.total) ? "paid" : "partial";
          await supabase.from("invoices").update({
            amount_paid: newPaid,
            status: newStatus,
            payment_method: "card",
            stripe_payment_intent_id: pi.id,
            ...(newStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
          }).eq("id", invoiceId);
        }

        await supabase.from("platform_fee_ledger").insert({
          tenant_id: tenantId,
          payment_id: null,
          amount: platformFee,
          stripe_application_fee_id: charge?.application_fee as string || null,
        });

        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase.from("payments").update({ status: "failed" }).eq("stripe_payment_intent_id", pi.id);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboarded = account.charges_enabled && account.payouts_enabled;

        await supabase.from("tenants").update({
          stripe_connect_onboarded: onboarded,
        }).eq("stripe_connect_account_id", account.id);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "payment") break;

        const invoiceId = session.metadata?.invoice_id;
        const tenantId = session.metadata?.tenant_id;
        if (!invoiceId || !tenantId) break;

        const pi = session.payment_intent
          ? await stripe.paymentIntents.retrieve(session.payment_intent as string)
          : null;

        if (pi) {
          const amount = pi.amount / 100;
          const platformFee = amount * 0.0025;
          const stripeFee = amount * 0.029 + 0.30;
          const netAmount = amount - stripeFee - platformFee;

          const { data: existingPayment } = await supabase.from("payments").select("id").eq("stripe_payment_intent_id", pi.id).single();

          if (!existingPayment) {
            await supabase.from("payments").insert({
              tenant_id: tenantId,
              invoice_id: invoiceId,
              stripe_payment_intent_id: pi.id,
              amount,
              processing_fee: stripeFee,
              platform_fee: platformFee,
              net_amount: netAmount,
              payment_method_type: "card",
              status: pi.status === "succeeded" ? "succeeded" : "pending",
              customer_email: session.customer_details?.email || null,
              customer_name: session.customer_details?.name || null,
              completed_at: pi.status === "succeeded" ? new Date().toISOString() : null,
            });
          }

          if (pi.status === "succeeded") {
            const { data: invoice } = await supabase.from("invoices").select("total, amount_paid").eq("id", invoiceId).single();
            if (invoice) {
              const newPaid = Number(invoice.amount_paid) + amount;
              const newStatus = newPaid >= Number(invoice.total) ? "paid" : "partial";
              await supabase.from("invoices").update({
                amount_paid: newPaid,
                status: newStatus,
                payment_method: "card",
                stripe_payment_intent_id: pi.id,
                ...(newStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
              }).eq("id", invoiceId);
            }

            await supabase.from("platform_fee_ledger").insert({
              tenant_id: tenantId,
              amount: platformFee,
              stripe_application_fee_id: null,
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Connect webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
