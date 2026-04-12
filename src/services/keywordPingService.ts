import { callEdgeFunction, isSupabaseConfigured, supabase } from './supabaseClient';

export interface KeywordPing {
  id: string;
  keyword: string;
  hearing_id: string;
  hearing_title: string | null;
  matched_quote: string | null;
  created_at: string;
  read_at: string | null;
}

export async function getKeywordPings(token: string): Promise<KeywordPing[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('keyword_pings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching keyword pings:', error);
      return [];
    }

    return (data ?? []) as KeywordPing[];
  } catch (err) {
    console.error('Error fetching keyword pings:', err);
    return [];
  }
}

export async function dismissPing(token: string, pingId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase
    .from('keyword_pings')
    .update({ read_at: new Date().toISOString() })
    .eq('id', pingId);

  if (error) {
    throw new Error(error.message ?? 'Failed to dismiss ping');
  }
}

export async function triggerKeywordScan(
  token: string,
  enrichmentUrl: string,
): Promise<{ pingsCreated: number }> {
  if (!isSupabaseConfigured()) return { pingsCreated: 0 };

  return callEdgeFunction<{ pingsCreated: number }>('keyword-ping', {
    method: 'POST',
    token,
    body: { enrichmentUrl },
  });
}
