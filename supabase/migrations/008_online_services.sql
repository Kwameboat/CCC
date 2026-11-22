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
