-- CCC service-based attendance + absence alerts
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/fsfpegyvqwroeunehfml/sql/new

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
