import { callEdgeFunction, isSupabaseConfigured } from './supabaseClient';

export interface ActionKit {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  bill_numbers: string[];
  target_members: string[];
  call_to_action: string | null;
  org_name: string | null;
  org_logo_url: string | null;
  custom_css: Record<string, unknown>;
  branding: Record<string, unknown>;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ActionKitAnalytics {
  totalActions: number;
  byType: { email_sent: number; call_made: number; page_view: number };
  byDate: { date: string; count: number }[];
  byDistrict: { district: number; count: number }[];
  topMembers: { memberSlug: string; count: number }[];
}

export interface ActionKitSubmission {
  kitId: string;
  supporterName?: string;
  supporterEmail?: string;
  supporterZip?: string;
  districtNumber?: number;
  targetMemberSlug?: string;
  actionType: 'email_sent' | 'call_made' | 'page_view';
}

export async function getUserKits(token: string): Promise<ActionKit[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await callEdgeFunction<ActionKit[]>('action-kits', { method: 'GET', token });
  } catch (err) {
    console.error('Error fetching action kits:', err);
    return [];
  }
}

export async function createKit(
  token: string,
  kit: {
    title: string;
    description?: string;
    bill_numbers?: string[];
    target_members?: string[];
    call_to_action?: string;
    org_name?: string;
    org_logo_url?: string;
    branding?: Record<string, unknown>;
    custom_css?: Record<string, unknown>;
  }
): Promise<ActionKit> {
  return await callEdgeFunction<ActionKit>('action-kits', {
    method: 'POST',
    token,
    body: kit,
  });
}

export async function updateKit(
  token: string,
  kit: Partial<ActionKit> & { id: string }
): Promise<ActionKit> {
  return await callEdgeFunction<ActionKit>('action-kits', {
    method: 'PUT',
    token,
    body: kit,
  });
}

export async function deleteKit(token: string, kitId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/action-kits?id=${encodeURIComponent(kitId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Failed to delete action kit');
  }
}

export async function getKitAnalytics(token: string, kitId: string): Promise<ActionKitAnalytics> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/action-kit-analytics?kitId=${encodeURIComponent(kitId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Failed to fetch analytics');
  return data as ActionKitAnalytics;
}

/** Public endpoint - no token required */
export async function submitAction(submission: ActionKitSubmission): Promise<{ success: boolean }> {
  return await callEdgeFunction<{ success: boolean }>('action-kit-submit', {
    method: 'POST',
    body: submission,
  });
}

/** Fetch a published kit by slug (public, uses anon key only) */
export async function getPublishedKit(slug: string): Promise<ActionKit | null> {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/action_kits?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as ActionKit;
  } catch {
    return null;
  }
}

/** Fetch a published kit by id (public, uses anon key only) */
export async function getPublishedKitById(kitId: string): Promise<ActionKit | null> {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/action_kits?id=eq.${encodeURIComponent(kitId)}&status=eq.published&select=*`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as ActionKit;
  } catch {
    return null;
  }
}
