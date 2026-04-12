import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  try {
    const body = await req.json();
    const {
      kitId,
      supporterName,
      supporterEmail,
      supporterZip,
      districtNumber,
      targetMemberSlug,
      actionType,
    } = body;

    if (!kitId || !actionType) {
      return new Response(JSON.stringify({ error: 'kitId and actionType are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['email_sent', 'call_made', 'page_view'];
    if (!validTypes.includes(actionType)) {
      return new Response(JSON.stringify({ error: `actionType must be one of: ${validTypes.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that the action kit exists and is published
    const { data: kit, error: kitError } = await supabase
      .from('action_kits')
      .select('id, status')
      .eq('id', kitId)
      .single();

    if (kitError || !kit) {
      return new Response(JSON.stringify({ error: 'Action kit not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (kit.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Action kit is not published' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: check if same email submitted to same kit in last 5 minutes
    if (supporterEmail) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentSubmissions } = await supabase
        .from('action_kit_submissions')
        .select('id')
        .eq('action_kit_id', kitId)
        .eq('supporter_email', supporterEmail)
        .gte('created_at', fiveMinutesAgo)
        .limit(1);

      if (recentSubmissions && recentSubmissions.length > 0) {
        return new Response(JSON.stringify({ error: 'Please wait a few minutes before submitting again' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert submission
    const { error: insertError } = await supabase
      .from('action_kit_submissions')
      .insert({
        action_kit_id: kitId,
        supporter_name: supporterName ?? null,
        supporter_email: supporterEmail ?? null,
        supporter_zip: supporterZip ?? null,
        district_number: districtNumber ?? null,
        target_member_slug: targetMemberSlug ?? null,
        action_type: actionType,
        metadata: {},
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
