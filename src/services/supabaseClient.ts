import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Call a Supabase edge function with an optional Clerk Bearer token.
 * Returns the parsed JSON response or throws on error.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    formData?: FormData;
  } = {}
): Promise<T> {
  if (!supabaseUrl) throw new Error('Supabase not configured');

  const { method = 'POST', body, token, formData } = options;

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey ?? '',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    init
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Edge function error ${res.status}`);
  return data as T;
}
