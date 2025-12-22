
import { createClient } from '@supabase/supabase-js';

/**
 * CHARIS INFRASTRUCTURE: PRODUCTION SUPABASE CLIENT
 * 
 * Connected to Project: ixjdszpzbqhxxhphmtqe
 */

const SUPABASE_URL = 'https://ixjdszpzbqhxxhphmtqe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4amRzenB6dGJxaHhocGhtdHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MTkwNDQsImV4cCI6MjA4MTk5NTA0NH0.CrzGi9YLIT7f7dG3USKAMIGKNVkhpQUF6Q75C107q3E';

console.info("CCC CLOUD: PRODUCTION NODE ACTIVE");

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * DATABASE HEALTH AUDIT
 */
export const checkSupabaseConnection = async () => {
  try {
    // Check if the branches table exists and is accessible
    const { error } = await supabase.from('branches').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
};
