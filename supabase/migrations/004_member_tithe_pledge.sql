-- CCC member-linked tithe & pledge tracking
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/fsfpegyvqwroeunehfml/sql/new

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
