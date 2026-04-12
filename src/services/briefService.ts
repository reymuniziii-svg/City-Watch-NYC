import { callEdgeFunction } from './supabaseClient';
import type { BriefPreferences } from '../lib/types';

export async function getBriefPreferences(token: string): Promise<BriefPreferences | null> {
  return callEdgeFunction<BriefPreferences | null>('brief-preferences', { method: 'GET', token });
}

export async function updateBriefPreferences(token: string, prefs: Partial<BriefPreferences>): Promise<void> {
  await callEdgeFunction('brief-preferences', { method: 'POST', token, body: prefs });
}

export async function generateBriefNow(token: string): Promise<{ url: string }> {
  return callEdgeFunction<{ url: string }>('generate-brief', { method: 'POST', token });
}
