import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
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
    // GET — list user's action kits
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('action_kits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST — create new action kit (enterprise check)
    if (req.method === 'POST') {
      // Check enterprise tier
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('user_id', userId)
        .single();

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const tier = (subscription?.status === 'active' && subscription?.plan) ? subscription.plan : (profile?.tier ?? 'free');

      if (tier !== 'enterprise') {
        return new Response(JSON.stringify({ error: 'Enterprise subscription required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { title, description, bill_numbers, target_members, call_to_action, org_name, org_logo_url, branding, custom_css } = body;

      if (!title) {
        return new Response(JSON.stringify({ error: 'Title is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate unique slug from title
      const baseSlug = slugify(title);
      let slug = baseSlug;
      let attempt = 0;
      while (true) {
        const { data: existing } = await supabase
          .from('action_kits')
          .select('id')
          .eq('slug', slug)
          .single();
        if (!existing) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const { data, error } = await supabase
        .from('action_kits')
        .insert({
          user_id: userId,
          title,
          slug,
          description: description ?? null,
          bill_numbers: bill_numbers ?? [],
          target_members: target_members ?? [],
          call_to_action: call_to_action ?? null,
          org_name: org_name ?? null,
          org_logo_url: org_logo_url ?? null,
          branding: branding ?? {},
          custom_css: custom_css ?? {},
          status: 'draft',
        })
        .select('*')
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT — update action kit (owner check)
    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from('action_kits')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Kit not found or access denied' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('action_kits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE — delete action kit and its submissions (owner check)
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const kitId = url.searchParams.get('id');

      if (!kitId) {
        return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from('action_kits')
        .select('id')
        .eq('id', kitId)
        .eq('user_id', userId)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Kit not found or access denied' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete submissions first (foreign key)
      await supabase
        .from('action_kit_submissions')
        .delete()
        .eq('action_kit_id', kitId);

      const { error } = await supabase
        .from('action_kits')
        .delete()
        .eq('id', kitId)
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
