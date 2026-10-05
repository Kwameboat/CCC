-- CHARIS CHRISTIAN CENTER: MASTER PRODUCTION SCHEMA v7.0
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_hq BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'GMT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'pastor', 'finance', 'kiosk', 'viewer')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Members
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  category TEXT DEFAULT 'Member',
  dept TEXT,
  status TEXT DEFAULT 'Active',
  photo_url TEXT,
  dob DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_branch ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- 4. Services (per-service attendance sessions)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_date DATE NOT NULL,
  service_time TIME,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_services_branch_date ON services(branch_id, service_date DESC);

-- 5. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  method TEXT DEFAULT 'Kiosk',
  is_first_timer BOOLEAN DEFAULT false,
  visitor_status TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_branch_created ON attendance(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_service ON attendance(service_id);

-- 5b. Consecutive-absence alerts
CREATE TABLE IF NOT EXISTS attendance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  alert_type TEXT DEFAULT 'consecutive_absence',
  miss_count INTEGER DEFAULT 3,
  details TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_branch_status ON attendance_alerts(branch_id, status);

-- 5. Counseling
CREATE TABLE IF NOT EXISTS counseling (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT,
  follow_up_status TEXT DEFAULT 'Pending',
  counselor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transactions (tithe/pledge linked to members)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_branch ON transactions(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(branch_id, type);

-- 6b. Pledges / promises
CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  promised_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'partial', 'fulfilled')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pledges_branch_status ON pledges(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_pledges_member ON pledges(member_id);

-- 7. Media & logistics
CREATE TABLE IF NOT EXISTS sermons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preacher TEXT NOT NULL,
  type TEXT DEFAULT 'Video',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'Email',
  target_group TEXT,
  recipient_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Queued',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Seed HQ (safe to re-run)
INSERT INTO branches (name, location, code, is_hq)
VALUES ('CCC Global HQ', 'Accra, Ghana', 'HQ-ACC', true)
ON CONFLICT (code) DO NOTHING;

-- 9. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Drop legacy open policies if present, then recreate authenticated staff policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','profiles','members','services','attendance','attendance_alerts','counseling',
    'transactions','pledges','sermons','events','products','broadcasts'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff Access" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Staff Access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- Profiles: users can read/update their own row
DROP POLICY IF EXISTS "Own profile read" ON profiles;
CREATE POLICY "Own profile read" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Own profile update" ON profiles;
CREATE POLICY "Own profile update" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Enable Realtime for attendance kiosk (ignore if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE services;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
