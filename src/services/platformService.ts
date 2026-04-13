import { callEdgeFunction, isSupabaseConfigured } from './supabaseClient';

export interface PolicyPlatform {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_type: 'pdf' | 'txt';
  file_size: number;
  status: 'uploaded' | 'processing' | 'analyzed' | 'error';
  created_at: string;
}

export async function uploadPlatform(token: string, file: File): Promise<{ id: string; filename: string }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const formData = new FormData();
  formData.append('file', file);

  return await callEdgeFunction<{ id: string; filename: string }>('upload-platform', {
    method: 'POST',
    token,
    formData,
  });
}

export async function getUserPlatforms(token: string): Promise<PolicyPlatform[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await callEdgeFunction<PolicyPlatform[]>('upload-platform', { method: 'GET', token });
  } catch (err) {
    console.error('Error fetching platforms:', err);
    return [];
  }
}

export async function deletePlatform(token: string, platformId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/upload-platform?id=${encodeURIComponent(platformId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Failed to delete platform');
  }
}
