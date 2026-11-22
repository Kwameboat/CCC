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
