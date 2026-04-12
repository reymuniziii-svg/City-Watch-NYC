import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
    const url = new URL(req.url);
    const kitId = url.searchParams.get('kitId');

    if (!kitId) {
      return new Response(JSON.stringify({ error: 'kitId query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user owns the kit
    const { data: kit, error: kitError } = await supabase
      .from('action_kits')
      .select('id')
      .eq('id', kitId)
      .eq('user_id', userId)
      .single();

    if (kitError || !kit) {
      return new Response(JSON.stringify({ error: 'Kit not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all submissions for this kit
    const { data: submissions, error: subError } = await supabase
      .from('action_kit_submissions')
      .select('action_type, district_number, target_member_slug, created_at')
      .eq('action_kit_id', kitId);

    if (subError) throw subError;

    const allSubmissions = submissions ?? [];

    // Total actions
    const totalActions = allSubmissions.length;

    // By type
    const byType = { email_sent: 0, call_made: 0, page_view: 0 };
    for (const sub of allSubmissions) {
      if (sub.action_type === 'email_sent') byType.email_sent++;
      else if (sub.action_type === 'call_made') byType.call_made++;
      else if (sub.action_type === 'page_view') byType.page_view++;
    }

    // By date (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateCounts: Record<string, number> = {};

    // Initialize all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dateCounts[key] = 0;
    }

    for (const sub of allSubmissions) {
      const dateKey = sub.created_at?.slice(0, 10);
      if (dateKey && dateKey in dateCounts) {
        dateCounts[dateKey]++;
      }
    }

    const byDate = Object.entries(dateCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // By district (top 10)
    const districtCounts: Record<number, number> = {};
    for (const sub of allSubmissions) {
      if (sub.district_number != null) {
        districtCounts[sub.district_number] = (districtCounts[sub.district_number] || 0) + 1;
      }
    }
    const byDistrict = Object.entries(districtCounts)
      .map(([district, count]) => ({ district: Number(district), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top members (top 10)
    const memberCounts: Record<string, number> = {};
    for (const sub of allSubmissions) {
      if (sub.target_member_slug) {
        memberCounts[sub.target_member_slug] = (memberCounts[sub.target_member_slug] || 0) + 1;
      }
    }
    const topMembers = Object.entries(memberCounts)
      .map(([memberSlug, count]) => ({ memberSlug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const analytics = {
      totalActions,
      byType,
      byDate,
      byDistrict,
      topMembers,
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
