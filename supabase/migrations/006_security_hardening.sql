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
