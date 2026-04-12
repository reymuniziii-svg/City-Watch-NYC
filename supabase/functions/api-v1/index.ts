import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Simple in-memory rate limiter: 100 requests per minute per key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(keyPrefix: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyPrefix);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyPrefix, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function hexEncode(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return hexEncode(hashBuffer);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function paginate<T>(items: T[], page: number, limit: number): { data: T[]; pagination: { page: number; limit: number; total: number } } {
  const total = items.length;
  const start = (page - 1) * limit;
  const sliced = items.slice(start, start + limit);
  return { data: sliced, pagination: { page, limit, total } };
}

async function fetchJSON(path: string): Promise<unknown[]> {
  const appUrl = Deno.env.get('APP_URL') ?? '';
  if (!appUrl) return [];
  try {
    const res = await fetch(`${appUrl}/data/${path}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Auth: API key in Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid API key' }, 401);
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    return jsonResponse({ error: 'Missing API key' }, 401);
  }

  const keyHash = await hashKey(apiKey);
  const keyPrefix = apiKey.substring(0, 8);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Look up key hash
  const { data: keyRecord, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (keyError || !keyRecord) {
    return jsonResponse({ error: 'Invalid API key' }, 401);
  }

  if (keyRecord.revoked_at) {
    return jsonResponse({ error: 'API key has been revoked' }, 401);
  }

  // Verify enterprise subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', keyRecord.user_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!sub || sub.plan !== 'enterprise') {
    return jsonResponse({ error: 'Enterprise subscription required' }, 403);
  }

  // Rate limiting
  if (!checkRateLimit(keyPrefix)) {
    return jsonResponse({ error: 'Rate limit exceeded. Max 100 requests per minute.' }, 429);
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {});

  // Parse route
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Expected pattern: /api-v1/... or just the path after function name
  // Supabase edge functions receive the path after /functions/v1/api-v1/
  // So pathParts might be empty or contain the resource path
  const routePath = pathParts.join('/');

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));

  try {
    // Route: bills listing
    if (routePath === '' || routePath === 'bills') {
      const bills = (await fetchJSON('bills-index.json')) as Record<string, unknown>[];
      let filtered = bills;

      const status = url.searchParams.get('status');
      if (status) {
        filtered = filtered.filter((b: Record<string, unknown>) =>
          String(b.statusName ?? '').toLowerCase().includes(status.toLowerCase())
        );
      }

      const committee = url.searchParams.get('committee');
      if (committee) {
        filtered = filtered.filter((b: Record<string, unknown>) =>
          String(b.committeeName ?? '').toLowerCase().includes(committee.toLowerCase())
        );
      }

      const q = url.searchParams.get('q');
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter((b: Record<string, unknown>) =>
          String(b.title ?? '').toLowerCase().includes(query) ||
          String(b.introNumber ?? '').toLowerCase().includes(query)
        );
      }

      return jsonResponse(paginate(filtered, page, limit));
    }

    // Route: single bill
    const billMatch = routePath.match(/^bills\/(.+)$/);
    if (billMatch) {
      const billId = decodeURIComponent(billMatch[1]);
      const bills = (await fetchJSON('bills-index.json')) as Record<string, unknown>[];
      const bill = bills.find((b: Record<string, unknown>) =>
        b.introNumber === billId || b.id === billId
      );
      if (!bill) return jsonResponse({ error: 'Bill not found' }, 404);
      return jsonResponse({ data: bill });
    }

    // Route: members listing
    if (routePath === 'members') {
      const members = (await fetchJSON('members.json')) as Record<string, unknown>[];
      let filtered = members;

      const borough = url.searchParams.get('borough');
      if (borough) {
        filtered = filtered.filter((m: Record<string, unknown>) =>
          String(m.borough ?? '').toLowerCase().includes(borough.toLowerCase())
        );
      }

      const party = url.searchParams.get('party');
      if (party) {
        filtered = filtered.filter((m: Record<string, unknown>) =>
          String(m.party ?? '').toLowerCase().includes(party.toLowerCase())
        );
      }

      return jsonResponse(paginate(filtered, page, limit));
    }

    // Route: single member
    const memberMatch = routePath.match(/^members\/(.+)$/);
    if (memberMatch) {
      const slug = decodeURIComponent(memberMatch[1]);
      const members = (await fetchJSON('members.json')) as Record<string, unknown>[];
      const member = members.find((m: Record<string, unknown>) =>
        m.slug === slug || m.id === slug
      );
      if (!member) return jsonResponse({ error: 'Member not found' }, 404);
      return jsonResponse({ data: member });
    }

    // Route: hearings listing
    if (routePath === 'hearings') {
      const hearings = (await fetchJSON('hearings.json')) as Record<string, unknown>[];
      let filtered = hearings;

      const upcoming = url.searchParams.get('upcoming');
      if (upcoming === 'true') {
        const now = new Date().toISOString();
        filtered = filtered.filter((h: Record<string, unknown>) =>
          String(h.date ?? '') >= now
        );
      }

      return jsonResponse(paginate(filtered, page, limit));
    }

    // Route: campaign finance
    const financeMatch = routePath.match(/^finance\/(.+)$/);
    if (financeMatch) {
      const slug = decodeURIComponent(financeMatch[1]);
      const finance = (await fetchJSON('campaign-finance.json')) as Record<string, unknown>[];
      const record = finance.find((f: Record<string, unknown>) =>
        f.slug === slug || f.candidateId === slug
      );
      if (!record) return jsonResponse({ error: 'Finance record not found' }, 404);
      return jsonResponse({ data: record });
    }

    // Route: influence map
    if (routePath === 'influence') {
      const influence = await fetchJSON('influence-map.json');
      return jsonResponse(paginate(influence as Record<string, unknown>[], page, limit));
    }

    // Route: lobbying
    if (routePath === 'lobbying') {
      const lobbying = await fetchJSON('lobbying-index.json');
      return jsonResponse(paginate(lobbying as Record<string, unknown>[], page, limit));
    }

    return jsonResponse({ error: 'Not found', availableRoutes: [
      'GET /bills',
      'GET /bills/:id',
      'GET /members',
      'GET /members/:slug',
      'GET /hearings',
      'GET /finance/:slug',
      'GET /influence',
      'GET /lobbying',
    ] }, 404);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
