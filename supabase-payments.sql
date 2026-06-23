-- ============================================
-- Crewline Payment Schema Migration
-- Run this in Supabase SQL Editor AFTER the base schema
-- ============================================

-- 1. ADD STRIPE COLUMNS TO TENANTS

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- 2. ADD STRIPE COLUMNS TO INVOICES

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 3. PAYMENTS TABLE

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  processing_fee NUMERIC(12,2) DEFAULT 0,
  platform_fee NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  payment_method_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_email TEXT,
  customer_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (tenant_id = public.get_tenant_id() OR public.is_crewline_admin());
CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id() OR public.is_crewline_admin());

-- 4. PLATFORM FEE LEDGER (admin-only)

CREATE TABLE IF NOT EXISTS platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  payment_id UUID REFERENCES payments(id),
  amount NUMERIC(12,2) NOT NULL,
  stripe_application_fee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_fee_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_admin_only" ON platform_fee_ledger
  FOR SELECT USING (public.is_crewline_admin());
CREATE POLICY "ledger_insert" ON platform_fee_ledger
  FOR INSERT WITH CHECK (true);

-- 5. SUBSCRIPTION EVENTS (audit log)

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_events_select" ON subscription_events
  FOR SELECT USING (tenant_id = public.get_tenant_id() OR public.is_crewline_admin());
CREATE POLICY "sub_events_insert" ON subscription_events
  FOR INSERT WITH CHECK (true);
