import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface ActionKit {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  bill_filter_ids: string[];
  custom_branding: Record<string, unknown>;
  cta_type: 'email' | 'call' | 'both';
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export async function getUserKits(userId: string): Promise<ActionKit[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase!
    .from('action_kits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActionKit[];
}

export async function createKit(userId: string, kit: Partial<ActionKit>): Promise<ActionKit> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const { data, error } = await supabase!
    .from('action_kits')
    .insert({ ...kit, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as ActionKit;
}

export async function updateKit(userId: string, kitId: string, updates: Partial<ActionKit>): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const { error } = await supabase!
    .from('action_kits')
    .update(updates)
    .eq('id', kitId)
    .eq('user_id', userId);
  if (error) throw error;
}
