
import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION SUPABASE CONFIGURATION
 * 
 * To connect your live Charis Christian Center project:
 * 1. Obtain your Project URL and Anon Key from your Supabase Dashboard (Settings > API).
 * 2. Add them as SUPABASE_URL and SUPABASE_ANON_KEY in your hosting environment variables.
 * 3. The app will automatically detect these and switch from Demo Mode to Production Mode.
 */

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-placeholder';

// The client is initialized with placeholders if real keys are missing to prevent the
// "supabaseUrl is required" error during the initial application load.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * PRODUCTION SQL MIGRATION SCRIPT
 * 
 * Run the following in your Supabase SQL Editor to provision your database structure:
 * 
-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_hq BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'GMT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Members Table
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

-- 3. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  method TEXT DEFAULT 'Kiosk',
  is_first_timer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Finance Table
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Realtime for Monitoring
ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER TABLE finance_transactions REPLICA IDENTITY FULL;

-- 6. Insert Default HQ Branch
INSERT INTO branches (name, location, code, is_hq) 
VALUES ('CCC Global HQ', 'Accra, Ghana', 'HQ-ACC', true)
ON CONFLICT (code) DO NOTHING;
*/
