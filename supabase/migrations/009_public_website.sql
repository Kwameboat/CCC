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
