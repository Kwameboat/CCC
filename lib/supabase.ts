
import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION SUPABASE CONFIGURATION
 * 
 * Vite (Vercel) uses import.meta.env for secrets.
 * Fallback to process.env for CI/CD environments and local testing.
 */

// @ts-ignore - Handle environment differences between Vite and Node
const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
// @ts-ignore
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

// Detect environment status
const isLive = !!(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project-url'));

if (!isLive) {
  console.info("--- CCC INFRASTRUCTURE: DEMO MODE ---");
  console.info("To enable production, add VITE_SUPABASE_URL to your Vercel Environment Variables.");
} else {
  console.info("--- CCC INFRASTRUCTURE: PRODUCTION MODE ---");
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
 * DATABASE HEALTH CHECK
 */
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('branches').select('count', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
};
