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
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('action_kits')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching kits:', error);
    return [];
  }
  return data as ActionKit[];
}

export async function getKitBySlug(slug: string): Promise<ActionKit | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('action_kits')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Error fetching kit:', error);
    return null;
  }
  return data as ActionKit | null;
}

export async function createKit(userId: string, kit: Partial<ActionKit>): Promise<ActionKit> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('action_kits')
    .insert({ user_id: userId, ...kit })
    .select()
    .single();

  if (error) throw error;
  return data as ActionKit;
}

export async function updateKit(userId: string, kitId: string, updates: Partial<ActionKit>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase
    .from('action_kits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', kitId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function trackInteraction(kitId: string, type: string, referrer?: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase
    .from('action_kit_interactions')
    .insert({ kit_id: kitId, interaction_type: type, referrer: referrer || null });

  if (error) console.error('Error tracking interaction:', error);
}
