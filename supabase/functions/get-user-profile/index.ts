import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Extract email from Clerk JWT payload (if present as a claim). */
function extractEmailFromToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userId = await validateClerkJWT(authHeader);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  try {
    // Fetch profile and subscription in parallel
    const [profileRes, subRes] = await Promise.all([
      supabase.from('profiles').select('tier, email, display_name').eq('id', userId).maybeSingle(),
      supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', userId).maybeSingle(),
    ]);

    let profile = profileRes.data;

    // Auto-create profile on first sign-in
    if (!profile) {
      const email = extractEmailFromToken(authHeader);
      const { data: created } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, email: email ?? null, tier: 'free' },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        .select('tier, email, display_name')
        .single();
      profile = created;
    }

    return new Response(
      JSON.stringify({
        profile: profile ?? null,
        subscription: subRes.data ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
