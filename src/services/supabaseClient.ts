import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (import.meta.env.DEV) {
  if (!supabaseUrl) console.warn('[City Watch] VITE_SUPABASE_URL is not set — database features disabled');
  if (!supabaseAnonKey) console.warn('[City Watch] VITE_SUPABASE_ANON_KEY is not set — database features disabled');
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
