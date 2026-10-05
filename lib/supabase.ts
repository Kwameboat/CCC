import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasSupabaseConfig) {
  console.error(
    'CCC: Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set Vercel env vars.'
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!hasSupabaseConfig) return false;
  try {
    const { error } = await supabase.from('branches').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

export const isDemoLoginEnabled = (): boolean =>
  import.meta.env.DEV === true || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';
