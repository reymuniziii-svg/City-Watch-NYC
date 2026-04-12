import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function hexEncode(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return hexEncode(hashBuffer);
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hexEncode(bytes.buffer);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const userId = await validateClerkJWT(req.headers.get('Authorization'));
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  try {
    // GET: List user's API keys (redacted)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_prefix, label, last_used_at, created_at, revoked_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data ?? []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Generate new API key
    if (req.method === 'POST') {
      // Validate enterprise subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, plan')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!sub || sub.plan !== 'enterprise') {
        return new Response(JSON.stringify({ error: 'Enterprise subscription required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json().catch(() => ({}));
      const label = body.label ?? null;

      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const keyPrefix = rawKey.substring(0, 8);

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: userId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          label,
        })
        .select('id, key_prefix, label, last_used_at, created_at, revoked_at')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ ...data, key: rawKey }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE: Revoke a key
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const keyId = url.searchParams.get('id');

      if (!keyId) {
        return new Response(JSON.stringify({ error: 'Missing key id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
