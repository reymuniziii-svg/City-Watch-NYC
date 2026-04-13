import { callEdgeFunction, isSupabaseConfigured } from './supabaseClient';

export interface AlertPreferences {
  user_id: string;
  frequency: 'daily' | 'weekly';
  enabled: boolean;
  last_sent_at: string | null;
  created_at: string;
}

export async function getAlertPreferences(token: string): Promise<AlertPreferences | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await callEdgeFunction<AlertPreferences | null>('alert-preferences', { method: 'GET', token });
  } catch (err) {
    console.error('Error fetching alert preferences:', err);
    return null;
  }
}

export async function updateAlertPreferences(
  token: string,
  prefs: Partial<Pick<AlertPreferences, 'frequency' | 'enabled'>>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await callEdgeFunction('alert-preferences', { method: 'POST', token, body: prefs });
}
