-- ============================================
-- Crewline Multi-Tenant Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. TABLES

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  logo_url TEXT,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'business_owner',
  team_role TEXT DEFAULT 'technician',
  color TEXT DEFAULT '#3B82F6',
  skills TEXT[] DEFAULT '{}',
  availability JSONB DEFAULT '{}',
  status TEXT DEFAULT 'available',
  current_location JSONB,
  active_job_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'phone',
  total_spent NUMERIC(12,2) DEFAULT 0,
  job_count INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 5,
  last_contact_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  customer_id UUID REFERENCES customers(id),
  assigned_to UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'medium',
  scheduled_date DATE,
  scheduled_time TIME,
  estimated_duration NUMERIC(4,1),
  actual_duration NUMERIC(4,1),
  address TEXT,
  city TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  line_items JSONB DEFAULT '[]',
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  job_id UUID REFERENCES jobs(id),
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  job_id UUID REFERENCES jobs(id),
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  direction TEXT NOT NULL,
  channel TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  revenue NUMERIC(12,2) DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  estimates_sent INTEGER DEFAULT 0,
  UNIQUE(tenant_id, date)
);

-- 2. INDEXES

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(tenant_id, status);
CREATE INDEX idx_jobs_date ON jobs(tenant_id, scheduled_date);
CREATE INDEX idx_estimates_tenant ON estimates(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_customer ON messages(tenant_id, customer_id);
CREATE INDEX idx_daily_stats_tenant ON daily_stats(tenant_id, date);

-- 3. HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_crewline_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'crewline_admin' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. ROW-LEVEL SECURITY

-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (id = auth.tenant_id() OR auth.is_crewline_admin());
CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (id = auth.tenant_id() OR auth.is_crewline_admin());
CREATE POLICY "tenants_delete" ON tenants FOR DELETE USING (auth.is_crewline_admin());

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin() OR id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR auth.is_crewline_admin());
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (auth.is_crewline_admin());

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_all" ON customers FOR ALL USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin()) WITH CHECK (tenant_id = auth.tenant_id());

-- Jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_all" ON jobs FOR ALL USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin()) WITH CHECK (tenant_id = auth.tenant_id());

-- Estimates
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimates_all" ON estimates FOR ALL USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin()) WITH CHECK (tenant_id = auth.tenant_id());

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_all" ON invoices FOR ALL USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin()) WITH CHECK (tenant_id = auth.tenant_id());

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all" ON messages FOR ALL USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin()) WITH CHECK (tenant_id = auth.tenant_id());

-- Daily Stats
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_stats_all" ON daily_stats FOR ALL USING (tenant_id = auth.tenant_id() OR auth.is_crewline_admin()) WITH CHECK (tenant_id = auth.tenant_id());

-- 5. AUTO-CREATE PROFILE ON SIGNUP

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'business_owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
