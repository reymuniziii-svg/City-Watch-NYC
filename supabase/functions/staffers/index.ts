import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const district = url.searchParams.get('district');
      const committee = url.searchParams.get('committee');

      let query = supabase.from('staffers').select('*');

      // Non-submitters only see verified staffers
      query = query.or(`verified.eq.true,submitted_by.eq.${userId}`);

      if (district) {
        query = query.eq('district_number', parseInt(district));
      }

      if (committee) {
        query = query.contains('policy_areas', [committee]);
      }

      const { data, error } = await query.order('full_name');

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { district_number, member_slug, full_name, title, email, phone, policy_areas } = body;

      if (!full_name) {
        return new Response(JSON.stringify({ error: 'full_name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('staffers')
        .insert({
          district_number,
          member_slug,
          full_name,
          title,
          email,
          phone,
          policy_areas: policy_areas || [],
          submitted_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user is submitter or admin
      const { data: staffer } = await supabase
        .from('staffers')
        .select('submitted_by')
        .eq('id', id)
        .single();

      if (!staffer) {
        return new Response(JSON.stringify({ error: 'Staffer not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check admin status via team membership
      const { data: adminMembership } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .limit(1);

      const isAdmin = adminMembership && adminMembership.length > 0;
      const isSubmitter = staffer.submitted_by === userId;

      if (!isSubmitter && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('staffers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('staffers')
        .delete()
        .eq('id', id)
        .eq('submitted_by', userId);

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
