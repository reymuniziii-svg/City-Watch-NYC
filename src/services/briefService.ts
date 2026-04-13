import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { BriefPreferences } from '../lib/types';

export async function getBriefPreferences(userId: string): Promise<BriefPreferences | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase!
    .from('brief_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching brief preferences:', error);
    return null;
  }
  return data as BriefPreferences | null;
}

export async function saveBriefPreferences(prefs: BriefPreferences): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('brief_preferences')
    .upsert(prefs, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving brief preferences:', error);
    throw error;
  }
}

export async function generateBriefNow(userId: string): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const { data, error } = await supabase!
    .functions
    .invoke('generate-brief', { body: { userId } });

  if (error) {
    console.error('Error generating brief:', error);
    throw error;
  }
  return data.url;
}
