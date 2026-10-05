import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Production Supabase client.
 * Prefer Vercel / .env.local values. Fallback keeps existing deploy online
 * until env vars are configured; rotate keys after moving secrets out of git.
 */
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ixjdszpzbqhxxhphmtqe.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4amRzenB6dGJxaHhocGhtdHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MTkwNDQsImV4cCI6MjA4MTk5NTA0NH0.CrzGi9YLIT7f7dG3USKAMIGKNVkhpQUF6Q75C107q3E';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'CCC: Using fallback Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.'
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('branches').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

export const isDemoLoginEnabled = (): boolean =>
  import.meta.env.DEV === true || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';
