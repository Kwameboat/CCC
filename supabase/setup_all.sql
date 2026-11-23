-- =============================================================================
-- CCC — FULL SETUP FOR A NEW SUPABASE PROJECT (one paste)
-- Project: https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new
--
-- Paste this whole file into the SQL Editor and click Run. Safe to re-run.
-- Generated from supabase/schema.sql + migrations 002–010 (in that order).
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


-- ============================== migrations/007_api_grants.sql ==============================

-- CCC 007: table privileges for the Data API + make sure the owner account is admin
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new
--
-- Newer Supabase projects do not automatically grant the `authenticated` role access to
-- tables created in the SQL Editor. Without these grants every query fails with
-- "permission denied for table ..." and the app falls back to the Viewer role.
-- Row Level Security (migration 006) still decides WHICH rows each staff member can touch.
-- The `anon` role (not signed in) intentionally gets no table access.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Tables created later in this schema get the same access
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- RPCs the app calls / RLS helpers (re-stated so this file is self-contained)
GRANT EXECUTE ON FUNCTION public.restore_admin_if_none() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_has_module(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_can(TEXT[]) TO authenticated;

-- Create profiles for any auth users that signed up before the trigger existed
INSERT INTO public.profiles (id, full_name, email, role, permissions, is_active)
SELECT u.id,
       COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
       u.email,
       'viewer',
       '{}',
       false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- If there is still no active admin, promote the earliest-created account
UPDATE public.profiles
SET role = 'admin',
    permissions = ARRAY[
      'dashboard','members','finance','attendance','counseling',
      'store','sermons','events','communication','cms','settings'
    ],
    is_active = true,
    updated_at = NOW()
WHERE id = (
  SELECT u.id FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE role = 'admin' AND COALESCE(is_active, true)
);

-- Show the result
SELECT email, role, is_active FROM public.profiles ORDER BY created_at;


-- ============================== migrations/008_online_services.sql ==============================

-- CCC 008: Online services (livestream page for members + live chat + online attendance)
-- Run in Supabase SQL Editor AFTER 006 and 007:
--   https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new
--
-- Staff with the new "online" module manage streams in the console.
-- Members open the public page  https://<your-site>/live  — no login needed — to watch,
-- "join" (counted in attendance with method 'Online') and chat.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  preacher TEXT CHECK (preacher IS NULL OR char_length(preacher) <= 120),
  stream_url TEXT NOT NULL CHECK (stream_url ~* '^https://'),
  replay_url TEXT CHECK (replay_url IS NULL OR replay_url ~* '^https://'),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_status_time ON live_streams(status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_branch ON live_streams(branch_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 500),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_stream_time ON live_chat_messages(stream_id, created_at);

-- ---------------------------------------------------------------------------
-- 2. Add the "online" module to role presets (pastor gets it; admin has everything)
-- ---------------------------------------------------------------------------

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
                WHEN 'pastor'  THEN ARRAY['dashboard','members','attendance','counseling','sermons','events','communication','online']
                WHEN 'finance' THEN ARRAY['dashboard','finance','store']
                WHEN 'kiosk'   THEN ARRAY['attendance']
                ELSE ARRAY['dashboard']
              END
            ))
      )
  );
$$;

-- Pastors whose permissions were saved explicitly as the old preset also get "online"
UPDATE public.profiles
SET permissions = array_append(permissions, 'online')
WHERE role = 'pastor'
  AND NOT ('online' = ANY (COALESCE(permissions, '{}')))
  AND permissions @> ARRAY['dashboard','members','attendance','counseling','sermons','events','communication'];

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public streams readable" ON live_streams;
DROP POLICY IF EXISTS "Staff read streams" ON live_streams;
DROP POLICY IF EXISTS "Staff insert streams" ON live_streams;
DROP POLICY IF EXISTS "Staff update streams" ON live_streams;
DROP POLICY IF EXISTS "Staff delete streams" ON live_streams;

-- Anyone (including signed-out members) can see public streams
CREATE POLICY "Public streams readable" ON live_streams
  FOR SELECT TO anon, authenticated
  USING (is_public);

CREATE POLICY "Staff read streams" ON live_streams
  FOR SELECT TO authenticated
  USING (public.staff_can(ARRAY['online']));

CREATE POLICY "Staff insert streams" ON live_streams
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_can(ARRAY['online']));

CREATE POLICY "Staff update streams" ON live_streams
  FOR UPDATE TO authenticated
  USING (public.staff_can(ARRAY['online']))
  WITH CHECK (public.staff_can(ARRAY['online']));

CREATE POLICY "Staff delete streams" ON live_streams
  FOR DELETE TO authenticated
  USING (public.staff_can(ARRAY['online']));

DROP POLICY IF EXISTS "Public chat readable" ON live_chat_messages;
DROP POLICY IF EXISTS "Staff read chat" ON live_chat_messages;
DROP POLICY IF EXISTS "Staff moderate chat" ON live_chat_messages;
DROP POLICY IF EXISTS "Staff delete chat" ON live_chat_messages;

-- Visible, non-hidden messages on public streams
CREATE POLICY "Public chat readable" ON live_chat_messages
  FOR SELECT TO anon, authenticated
  USING (
    NOT is_hidden
    AND EXISTS (SELECT 1 FROM live_streams s WHERE s.id = stream_id AND s.is_public)
  );

CREATE POLICY "Staff read chat" ON live_chat_messages
  FOR SELECT TO authenticated
  USING (public.staff_can(ARRAY['online']));

CREATE POLICY "Staff moderate chat" ON live_chat_messages
  FOR UPDATE TO authenticated
  USING (public.staff_can(ARRAY['online']))
  WITH CHECK (public.staff_can(ARRAY['online']));

CREATE POLICY "Staff delete chat" ON live_chat_messages
  FOR DELETE TO authenticated
  USING (public.staff_can(ARRAY['online']));

-- Note: there is deliberately NO insert policy on live_chat_messages.
-- Messages are posted only through post_live_chat() below, which validates and rate-limits.

-- ---------------------------------------------------------------------------
-- 4. Public RPCs (SECURITY DEFINER, validated)
-- ---------------------------------------------------------------------------

-- Join an online service: records attendance (method 'Online') once per name/phone per stream.
CREATE OR REPLACE FUNCTION public.join_online_service(p_stream_id UUID, p_name TEXT, p_phone TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s live_streams%ROWTYPE;
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_phone_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_member members%ROWTYPE;
  v_service UUID;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;
  IF char_length(v_phone_digits) > 20 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  END IF;

  SELECT * INTO s FROM live_streams WHERE id = p_stream_id AND is_public;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'stream_not_found');
  END IF;
  IF s.status <> 'live' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_live');
  END IF;

  -- Match a member of that branch by the last 9 digits of their phone number
  IF char_length(v_phone_digits) >= 9 THEN
    SELECT * INTO v_member FROM members m
    WHERE m.branch_id IS NOT DISTINCT FROM s.branch_id
      AND right(regexp_replace(COALESCE(m.phone, ''), '\D', '', 'g'), 9) = right(v_phone_digits, 9)
    LIMIT 1;
  END IF;

  v_service := s.service_id;

  -- Already joined this stream? (same member, or same name when not matched)
  IF EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.method = 'Online'
      AND a.created_at >= COALESCE(s.started_at, s.scheduled_at) - INTERVAL '6 hours'
      AND a.branch_id IS NOT DISTINCT FROM s.branch_id
      AND (a.service_id IS NOT DISTINCT FROM v_service)
      AND (
        (v_member.id IS NOT NULL AND a.member_id = v_member.id)
        OR (v_member.id IS NULL AND a.member_id IS NULL AND lower(a.name) = lower(v_name))
      )
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already', true,
      'member', v_member.id IS NOT NULL, 'name', COALESCE(v_member.name, v_name));
  END IF;

  INSERT INTO attendance (branch_id, service_id, member_id, name, method, is_first_timer, visitor_status)
  VALUES (
    s.branch_id,
    v_service,
    v_member.id,
    COALESCE(v_member.name, v_name),
    'Online',
    v_member.id IS NULL,
    CASE WHEN v_member.id IS NULL THEN 'online_guest' ELSE 'member' END
  );

  RETURN jsonb_build_object('ok', true, 'already', false,
    'member', v_member.id IS NOT NULL, 'name', COALESCE(v_member.name, v_name));
END;
$$;

-- Post a chat message: stream must be public, live and chat-enabled; simple flood control.
CREATE OR REPLACE FUNCTION public.post_live_chat(p_stream_id UUID, p_name TEXT, p_message TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s live_streams%ROWTYPE;
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_msg TEXT := btrim(COALESCE(p_message, ''));
  recent INTEGER;
BEGIN
  IF char_length(v_name) < 1 OR char_length(v_name) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;
  IF char_length(v_msg) < 1 OR char_length(v_msg) > 500 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_message');
  END IF;

  SELECT * INTO s FROM live_streams WHERE id = p_stream_id AND is_public;
  IF NOT FOUND OR s.status <> 'live' OR NOT s.chat_enabled THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'chat_closed');
  END IF;

  -- Max 5 messages per name per 30 seconds, and 60 per stream per 10 seconds overall
  SELECT COUNT(*) INTO recent FROM live_chat_messages
  WHERE stream_id = p_stream_id AND lower(display_name) = lower(v_name)
    AND created_at > NOW() - INTERVAL '30 seconds';
  IF recent >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slow_down');
  END IF;

  SELECT COUNT(*) INTO recent FROM live_chat_messages
  WHERE stream_id = p_stream_id AND created_at > NOW() - INTERVAL '10 seconds';
  IF recent >= 60 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slow_down');
  END IF;

  INSERT INTO live_chat_messages (stream_id, display_name, message)
  VALUES (p_stream_id, v_name, v_msg);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Online-attendance count for a stream (public, numbers only)
CREATE OR REPLACE FUNCTION public.online_join_count(p_stream_id UUID)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::integer FROM attendance a
  JOIN live_streams s ON s.id = p_stream_id AND s.is_public
  WHERE a.method = 'Online'
    AND a.branch_id IS NOT DISTINCT FROM s.branch_id
    AND a.service_id IS NOT DISTINCT FROM s.service_id
    AND a.created_at >= COALESCE(s.started_at, s.scheduled_at) - INTERVAL '6 hours'
    AND (s.ended_at IS NULL OR a.created_at <= s.ended_at + INTERVAL '1 hour');
$$;

REVOKE ALL ON FUNCTION public.join_online_service(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_live_chat(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.online_join_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_online_service(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_live_chat(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.online_join_count(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Table privileges (anon: read-only on these two tables; RLS limits rows)
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON live_streams, live_chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON live_streams, live_chat_messages TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Realtime (members see the stream go live and chat instantly)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ============================== migrations/009_public_website.sql ==============================

-- CCC 009: Public church website
-- Run in Supabase SQL Editor AFTER 006–008:
--   https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new
--
-- * site_content: the website's editable text (Console → Website). Public read, staff "cms" write.
-- * Public (signed-out) read access to events, sermons and branch names/locations.
-- * contact_messages: prayer requests / contact / plan-a-visit form. Visitors can only submit
--   through submit_contact_message() (validated + flood control); staff with "cms" or
--   "counseling" can read and manage them.

-- ---------------------------------------------------------------------------
-- 1. Editable website content
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO site_content (id, content) VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site content" ON site_content;
DROP POLICY IF EXISTS "Staff write site content" ON site_content;
DROP POLICY IF EXISTS "Staff insert site content" ON site_content;

CREATE POLICY "Public read site content" ON site_content
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Staff write site content" ON site_content
  FOR UPDATE TO authenticated
  USING (public.staff_can(ARRAY['cms']))
  WITH CHECK (public.staff_can(ARRAY['cms']));

CREATE POLICY "Staff insert site content" ON site_content
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_can(ARRAY['cms']));

-- Keep content a JSON object of sane size
ALTER TABLE site_content DROP CONSTRAINT IF EXISTS site_content_shape;
ALTER TABLE site_content ADD CONSTRAINT site_content_shape
  CHECK (jsonb_typeof(content) = 'object' AND pg_column_size(content) < 200000);

-- ---------------------------------------------------------------------------
-- 2. Public read of non-sensitive tables
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read events" ON events;
CREATE POLICY "Public read events" ON events FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public read sermons" ON sermons;
CREATE POLICY "Public read sermons" ON sermons FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public read branches" ON branches;
CREATE POLICY "Public read branches" ON branches FOR SELECT TO anon USING (true);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON site_content, events, sermons TO anon;
-- Branches: only the public-facing columns
REVOKE SELECT ON branches FROM anon;
GRANT SELECT (id, name, location, is_hq) ON branches TO anon;
GRANT SELECT, INSERT, UPDATE ON site_content TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Contact / prayer / plan-a-visit messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL DEFAULT 'contact' CHECK (kind IN ('prayer', 'contact', 'visit')),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 160),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 2 AND 3000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status, created_at DESC);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read messages" ON contact_messages;
DROP POLICY IF EXISTS "Staff update messages" ON contact_messages;
DROP POLICY IF EXISTS "Staff delete messages" ON contact_messages;

CREATE POLICY "Staff read messages" ON contact_messages
  FOR SELECT TO authenticated USING (public.staff_can(ARRAY['cms', 'counseling']));
CREATE POLICY "Staff update messages" ON contact_messages
  FOR UPDATE TO authenticated
  USING (public.staff_can(ARRAY['cms', 'counseling']))
  WITH CHECK (public.staff_can(ARRAY['cms', 'counseling']));
CREATE POLICY "Staff delete messages" ON contact_messages
  FOR DELETE TO authenticated USING (public.staff_can(ARRAY['cms', 'counseling']));

GRANT SELECT, UPDATE, DELETE ON contact_messages TO authenticated;
-- No INSERT grant for anon/authenticated: submissions go through the function below.

CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_kind TEXT, p_name TEXT, p_email TEXT, p_phone TEXT, p_message TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind TEXT := lower(btrim(COALESCE(p_kind, 'contact')));
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_email TEXT := NULLIF(lower(btrim(COALESCE(p_email, ''))), '');
  v_phone TEXT := NULLIF(btrim(COALESCE(p_phone, '')), '');
  v_msg TEXT := btrim(COALESCE(p_message, ''));
  recent INTEGER;
BEGIN
  IF v_kind NOT IN ('prayer', 'contact', 'visit') THEN v_kind := 'contact'; END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;
  IF char_length(v_msg) < 2 OR char_length(v_msg) > 3000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_message');
  END IF;
  IF v_email IS NOT NULL AND (char_length(v_email) > 160 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  IF v_phone IS NOT NULL AND char_length(v_phone) > 30 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  END IF;

  -- Flood control: 3 per sender per 10 minutes, 30 site-wide per minute
  SELECT COUNT(*) INTO recent FROM contact_messages
  WHERE created_at > NOW() - INTERVAL '10 minutes'
    AND (lower(name) = lower(v_name)
         OR (v_email IS NOT NULL AND email = v_email)
         OR (v_phone IS NOT NULL AND phone = v_phone));
  IF recent >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slow_down');
  END IF;
  SELECT COUNT(*) INTO recent FROM contact_messages WHERE created_at > NOW() - INTERVAL '1 minute';
  IF recent >= 30 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slow_down');
  END IF;

  INSERT INTO contact_messages (kind, name, email, phone, message)
  VALUES (v_kind, v_name, v_email, v_phone, v_msg);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ============================== migrations/010_streaming_server.sql ==============================

-- CCC 010: Church streaming server settings (self-hosted MediaMTX — see streaming-server/README.md)
-- Run in Supabase SQL Editor AFTER 008:
--   https://supabase.com/dashboard/project/txulgrxnoqdndtskbekm/sql/new
--
-- Stores the server's public addresses so the console can build stream links and show OBS
-- settings. The broadcast password is NOT stored here — it stays on the server.

CREATE TABLE IF NOT EXISTS streaming_settings (
  id TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  web_url TEXT CHECK (web_url IS NULL OR web_url ~* '^https://[^/\s]+/?$'),
  rtmp_url TEXT CHECK (rtmp_url IS NULL OR rtmp_url ~* '^rtmps?://[^/\s]+(:\d+)?/?$'),
  stream_path TEXT NOT NULL DEFAULT 'live' CHECK (stream_path ~ '^[A-Za-z0-9_-]{1,40}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO streaming_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

ALTER TABLE streaming_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read streaming settings" ON streaming_settings;
DROP POLICY IF EXISTS "Staff update streaming settings" ON streaming_settings;
DROP POLICY IF EXISTS "Staff insert streaming settings" ON streaming_settings;

CREATE POLICY "Staff read streaming settings" ON streaming_settings
  FOR SELECT TO authenticated USING (public.staff_can(ARRAY['online']));
CREATE POLICY "Staff update streaming settings" ON streaming_settings
  FOR UPDATE TO authenticated
  USING (public.staff_can(ARRAY['online']))
  WITH CHECK (public.staff_can(ARRAY['online']));
CREATE POLICY "Staff insert streaming settings" ON streaming_settings
  FOR INSERT TO authenticated WITH CHECK (public.staff_can(ARRAY['online']));

GRANT SELECT, INSERT, UPDATE ON streaming_settings TO authenticated;
-- No anon access: members only ever see the playback link on a public live stream.

