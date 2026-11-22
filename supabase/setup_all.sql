-- =============================================================================
-- CCC — FULL SETUP FOR A NEW SUPABASE PROJECT (one paste)
-- Project: https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new
--
-- Paste this whole file into the SQL Editor and click Run. Safe to re-run.
-- Generated from supabase/schema.sql + migrations 002–006 (in that order).
-- After it runs: Authentication → Users → Add user. The FIRST user becomes admin.
-- =============================================================================


-- ============================== schema.sql ==============================

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


-- ============================== migrations/002_staff_permissions.sql ==============================

-- CCC staff permissions upgrade (run in Supabase SQL Editor)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'pastor', 'finance', 'kiosk', 'viewer', 'custom'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  incoming_role TEXT;
  incoming_perms TEXT[];
BEGIN
  incoming_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');
  IF incoming_role NOT IN ('admin', 'pastor', 'finance', 'kiosk', 'viewer', 'custom') THEN
    incoming_role := 'viewer';
  END IF;

  IF NEW.raw_user_meta_data ? 'permissions' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'permissions'))
      INTO incoming_perms;
  ELSE
    incoming_perms := '{}';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, email, permissions, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    incoming_role,
    NEW.email,
    incoming_perms,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Avoid RLS recursion when checking admin role
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_active, true)
  );
$$;

DROP POLICY IF EXISTS "Staff Access" ON profiles;
DROP POLICY IF EXISTS "Own profile read" ON profiles;
DROP POLICY IF EXISTS "Own profile update" ON profiles;
DROP POLICY IF EXISTS "Profiles read authenticated" ON profiles;
DROP POLICY IF EXISTS "Profiles admin write" ON profiles;

CREATE POLICY "Profiles read authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles admin write" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id OR public.is_staff_admin())
  WITH CHECK (auth.uid() = id OR public.is_staff_admin());


-- ============================== migrations/003_service_attendance.sql ==============================

-- CCC service-based attendance + absence alerts
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new

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

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visitor_status TEXT DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_attendance_service ON attendance(service_id);

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

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff Access" ON services;
DROP POLICY IF EXISTS "Staff Access" ON attendance_alerts;

CREATE POLICY "Staff Access" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff Access" ON attendance_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE services;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ============================== migrations/004_member_tithe_pledge.sql ==============================

-- CCC member-linked tithe & pledge tracking
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_name TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(branch_id, type);

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

ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff Access" ON pledges;
CREATE POLICY "Staff Access" ON pledges FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================== migrations/005_restore_admin_access.sql ==============================

-- CCC: restore sidebar access after accidental viewer lockout
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new

-- 1) If there is currently NO active admin, promote the oldest profile to admin
UPDATE profiles
SET
  role = 'admin',
  permissions = ARRAY[
    'dashboard','members','finance','attendance','counseling',
    'store','sermons','events','communication','cms','settings'
  ],
  is_active = true,
  updated_at = NOW()
WHERE id = (
  SELECT p.id
  FROM profiles p
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM profiles
  WHERE role = 'admin' AND COALESCE(is_active, true)
);

-- 2) (removed) Name-based promotion was unsafe: anyone could sign up with a matching
--    name or email and become admin. Promote a specific account by id instead, e.g.
--    UPDATE profiles SET role = 'admin', is_active = true WHERE email = 'owner@example.org';

-- 3) RPC: any signed-in staff can call this if the church has zero admins
CREATE OR REPLACE FUNCTION public.restore_admin_if_none()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE role = 'admin' AND COALESCE(is_active, true);

  IF admin_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'admin_exists', 'admins', admin_count);
  END IF;

  UPDATE profiles
  SET
    role = 'admin',
    permissions = ARRAY[
      'dashboard','members','finance','attendance','counseling',
      'store','sermons','events','communication','cms','settings'
    ],
    is_active = true,
    updated_at = NOW()
  WHERE id = caller;

  RETURN jsonb_build_object('ok', true, 'role', 'admin');
END;
$$;

REVOKE ALL ON FUNCTION public.restore_admin_if_none() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_admin_if_none() TO authenticated;

-- 4) Never downgrade an existing admin when auth.users trigger re-fires
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  incoming_role TEXT;
  incoming_perms TEXT[];
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  incoming_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  IF incoming_role IS NULL OR incoming_role = '' THEN
    incoming_role := CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END;
  END IF;
  IF incoming_role NOT IN ('admin', 'pastor', 'finance', 'kiosk', 'viewer', 'custom') THEN
    incoming_role := CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END;
  END IF;

  IF NEW.raw_user_meta_data ? 'permissions' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'permissions'))
      INTO incoming_perms;
  ELSE
    incoming_perms := '{}';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, email, permissions, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    incoming_role,
    NEW.email,
    incoming_perms,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    role = CASE
      WHEN profiles.role = 'admin' THEN profiles.role
      ELSE EXCLUDED.role
    END,
    permissions = CASE
      WHEN profiles.role = 'admin' THEN profiles.permissions
      WHEN EXCLUDED.permissions IS NOT NULL AND coalesce(array_length(EXCLUDED.permissions, 1), 0) > 0
        THEN EXCLUDED.permissions
      ELSE profiles.permissions
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;


-- ============================== migrations/006_security_hardening.sql ==============================

-- CCC 006: security hardening
-- Run in the Supabase SQL Editor AFTER schema.sql and migrations 002–005.
--
-- What this fixes:
--   1. Staff could promote themselves to admin by updating their own profile row.
--   2. Anyone with the public anon key could sign up with role=admin in user metadata.
--   3. Every signed-in account could read/write every table (USING (true)).
--   4. restore_admin_if_none could be claimed by any brand-new signup.
--
-- After running this:
--   * New signups (other than the very first user) get an INACTIVE viewer profile.
--     They can do nothing until an admin activates them / sets their role in
--     Settings → Staff. Staff created from Settings → Staff are activated automatically.
--   * Table access is enforced in the database per module, mirroring lib/permissions.ts.

-- ---------------------------------------------------------------------------
-- 1. Permission helpers (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_active, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND COALESCE(is_active, true)
  );
$$;

-- Mirrors modulesForRole() in lib/permissions.ts
CREATE OR REPLACE FUNCTION public.staff_has_module(mod TEXT)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.is_active, true)
      AND (
        p.role = 'admin'
        OR (p.role = 'custom' AND mod = ANY (COALESCE(p.permissions, '{}')))
        OR (p.role <> 'custom'
            AND COALESCE(array_length(p.permissions, 1), 0) > 0
            AND mod = ANY (p.permissions))
        OR (p.role <> 'custom'
            AND COALESCE(array_length(p.permissions, 1), 0) = 0
            AND mod = ANY (
              CASE p.role
                WHEN 'pastor'  THEN ARRAY['dashboard','members','attendance','counseling','sermons','events','communication']
                WHEN 'finance' THEN ARRAY['dashboard','finance','store']
                WHEN 'kiosk'   THEN ARRAY['attendance']
                ELSE ARRAY['dashboard']
              END
            ))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_can(mods TEXT[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM unnest(mods) m WHERE public.staff_has_module(m));
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_has_module(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_can(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_has_module(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_can(TEXT[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Signup trigger: never trust role/permissions from user metadata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first;

  INSERT INTO public.profiles (id, full_name, role, email, permissions, is_active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    CASE WHEN is_first THEN 'admin' ELSE 'viewer' END,
    NEW.email,
    '{}',
    is_first          -- everyone after the first user waits for admin activation
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Guard privileged profile columns
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- No JWT (SQL editor, service role, auth signup trigger) or an active admin: allow.
  IF auth.uid() IS NULL OR public.is_staff_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'viewer';
    NEW.permissions := '{}';
    NEW.is_active := false;
    NEW.branch_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only administrators can change role, permissions, status or branch'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- 4. Profiles RLS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff Access" ON profiles;
DROP POLICY IF EXISTS "Own profile read" ON profiles;
DROP POLICY IF EXISTS "Own profile update" ON profiles;
DROP POLICY IF EXISTS "Profiles read authenticated" ON profiles;
DROP POLICY IF EXISTS "Profiles admin write" ON profiles;
DROP POLICY IF EXISTS "Profiles select" ON profiles;
DROP POLICY IF EXISTS "Profiles insert" ON profiles;
DROP POLICY IF EXISTS "Profiles update" ON profiles;
DROP POLICY IF EXISTS "Profiles delete" ON profiles;

CREATE POLICY "Profiles select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff_admin());

CREATE POLICY "Profiles insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_staff_admin());

CREATE POLICY "Profiles update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff_admin())
  WITH CHECK (id = auth.uid() OR public.is_staff_admin());

CREATE POLICY "Profiles delete" ON profiles
  FOR DELETE TO authenticated
  USING (public.is_staff_admin() AND id <> auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Per-module table policies (replace the old USING (true) "Staff Access")
--    read = NULL means any active staff member may read.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
  read_expr TEXT;
  write_expr TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('branches',          NULL::TEXT[],                          ARRAY['settings']),
      ('members',           NULL::TEXT[],                          ARRAY['members','attendance']),
      ('services',          ARRAY['attendance','dashboard'],       ARRAY['attendance']),
      ('attendance',        ARRAY['attendance','dashboard'],       ARRAY['attendance']),
      ('attendance_alerts', ARRAY['attendance'],                   ARRAY['attendance']),
      ('counseling',        ARRAY['counseling'],                   ARRAY['counseling']),
      ('transactions',      ARRAY['finance','dashboard'],          ARRAY['finance']),
      ('pledges',           ARRAY['finance'],                      ARRAY['finance']),
      ('sermons',           NULL::TEXT[],                          ARRAY['sermons']),
      ('events',            NULL::TEXT[],                          ARRAY['events']),
      ('products',          ARRAY['store','finance'],              ARRAY['store']),
      ('broadcasts',        ARRAY['communication'],                ARRAY['communication'])
    ) AS t(tbl, read_mods, write_mods)
  LOOP
    read_expr := CASE
      WHEN r.read_mods IS NULL THEN 'public.is_active_staff()'
      ELSE format('public.staff_can(%L::text[])', r.read_mods)
    END;
    write_expr := format('public.staff_can(%L::text[])', r.write_mods);

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Staff Access" ON %I', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Module read" ON %I', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Module insert" ON %I', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Module update" ON %I', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Module delete" ON %I', r.tbl);

    EXECUTE format('CREATE POLICY "Module read" ON %I FOR SELECT TO authenticated USING (%s)', r.tbl, read_expr);
    EXECUTE format('CREATE POLICY "Module insert" ON %I FOR INSERT TO authenticated WITH CHECK (%s)', r.tbl, write_expr);
    EXECUTE format('CREATE POLICY "Module update" ON %I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', r.tbl, write_expr, write_expr);
    EXECUTE format('CREATE POLICY "Module delete" ON %I FOR DELETE TO authenticated USING (%s)', r.tbl, write_expr);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. restore_admin_if_none: only an ACTIVE staff member (or the sole profile)
--    may claim admin, and only when no active admin exists.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restore_admin_if_none()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_active BOOLEAN;
  profile_total INTEGER;
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' AND COALESCE(is_active, true)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'admin_exists');
  END IF;

  SELECT COALESCE(is_active, true) INTO caller_active FROM profiles WHERE id = caller;
  SELECT COUNT(*) INTO profile_total FROM profiles;

  IF caller_active IS NULL OR (NOT caller_active AND profile_total > 1) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_eligible');
  END IF;

  UPDATE profiles
  SET role = 'admin',
      permissions = ARRAY[
        'dashboard','members','finance','attendance','counseling',
        'store','sermons','events','communication','cms','settings'
      ],
      is_active = true,
      updated_at = NOW()
  WHERE id = caller;

  RETURN jsonb_build_object('ok', true, 'role', 'admin');
END;
$$;

REVOKE ALL ON FUNCTION public.restore_admin_if_none() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_admin_if_none() TO authenticated;

