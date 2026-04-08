import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AlertPreferences {
  user_id: string;
  frequency: 'daily' | 'weekly';
  enabled: boolean;
  last_sent_at: string | null;
  created_at: string;
}

export async function getAlertPreferences(userId: string): Promise<AlertPreferences | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('alert_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching alert preferences:', error);
    return null;
  }
  return data as AlertPreferences | null;
}

export async function updateAlertPreferences(
  userId: string,
  prefs: Partial<Pick<AlertPreferences, 'frequency' | 'enabled'>>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase
    .from('alert_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error updating alert preferences:', error);
    throw error;
  }
}
