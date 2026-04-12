import { callEdgeFunction, isSupabaseConfigured } from './supabaseClient';

export interface ApiKey {
  id: string;
  key_prefix: string;
  label: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface NewApiKey extends ApiKey {
  key: string; // full key, shown only once
}

export async function listApiKeys(token: string): Promise<ApiKey[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await callEdgeFunction<ApiKey[]>('api-keys', { method: 'GET', token });
  } catch (err) {
    console.error('Error fetching API keys:', err);
    return [];
  }
}

export async function createApiKey(token: string, label: string): Promise<NewApiKey> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  return await callEdgeFunction<NewApiKey>('api-keys', {
    method: 'POST',
    token,
    body: { label },
  });
}

export async function revokeApiKey(token: string, keyId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/api-keys?id=${encodeURIComponent(keyId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Failed to revoke key');
  }
}
