-- CCC: restore sidebar access after accidental viewer lockout
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/fsfpegyvqwroeunehfml/sql/new

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

-- 2) Promote common owner account names back to admin (safe if already admin)
UPDATE profiles
SET
  role = 'admin',
  permissions = ARRAY[
    'dashboard','members','finance','attendance','counseling',
    'store','sermons','events','communication','cms','settings'
  ],
  is_active = true,
  updated_at = NOW()
WHERE role IS DISTINCT FROM 'admin'
  AND (
    email ILIKE '%boateng%'
    OR full_name ILIKE '%boateng%'
    OR email ILIKE '%kwame%'
    OR full_name ILIKE '%kwame%'
  );

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
