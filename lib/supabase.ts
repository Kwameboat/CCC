
import { createClient } from '@supabase/supabase-js';

/**
 * CHARIS INFRASTRUCTURE: SUPABASE CLIENT
 * 
 * Securely initializes the connection using environment variables.
 * Prioritizes VITE_ prefixed variables for the bundler.
 */

// @ts-ignore
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// @ts-ignore
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const isLive = !!(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project-url'));

if (!isLive) {
  console.info("CCC CLOUD: RUNNING IN DEMO MODE");
} else {
  console.info("CCC CLOUD: PRODUCTION NODE ACTIVE");
}

const finalUrl = SUPABASE_URL || 'https://your-project-url.supabase.co';
const finalKey = SUPABASE_ANON_KEY || 'your-anon-key-placeholder';

export const supabase = createClient(finalUrl, finalKey, {
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
    const { data, error } = await supabase.from('branches').select('count', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
};
