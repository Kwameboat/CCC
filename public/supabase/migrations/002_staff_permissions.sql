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
