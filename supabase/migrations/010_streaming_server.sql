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
