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

export async function getKitBySlug(slug: string): Promise<ActionKit | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase!
    .from('action_kits')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Error fetching action kit:', error);
    return null;
  }
  return data as ActionKit | null;
}

export async function trackInteraction(
  kitId: string,
  type: 'view' | 'email_click' | 'call_click',
  referrer?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('action_kit_interactions')
    .insert({
      kit_id: kitId,
      interaction_type: type,
      referrer: referrer ?? null,
    });

  if (error) {
    console.error('Error tracking interaction:', error);
  }
}
