import { supabase, isSupabaseConfigured } from './supabaseClient';

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

export async function uploadPlatform(userId: string, file: File): Promise<{ id: string; filename: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('upload-platform', {
    body: formData,
  });

  if (error) throw error;
  return data as { id: string; filename: string };
}

export async function getUserPlatforms(userId: string): Promise<PolicyPlatform[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('policy_platforms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching platforms:', error);
    return [];
  }
  return data as PolicyPlatform[];
}

export async function deletePlatform(userId: string, platformId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  // Get the storage path first
  const { data: platform } = await supabase
    .from('policy_platforms')
    .select('storage_path')
    .eq('id', platformId)
    .eq('user_id', userId)
    .single();

  if (platform?.storage_path) {
    await supabase.storage.from('policy-platforms').remove([platform.storage_path]);
  }

  const { error } = await supabase
    .from('policy_platforms')
    .delete()
    .eq('id', platformId)
    .eq('user_id', userId);

  if (error) throw error;
}
