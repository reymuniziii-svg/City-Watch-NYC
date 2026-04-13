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
      // List teams where user is owner or member
      const { data: ownedTeams, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', userId);

      if (ownedError) throw ownedError;

      const { data: memberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Merge owned teams and member teams, deduplicating
      const ownedIds = new Set((ownedTeams || []).map((t: { id: string }) => t.id));
      const memberTeams = (memberships || [])
        .filter((m: { team_id: string }) => !ownedIds.has(m.team_id))
        .map((m: { teams: unknown; role: string }) => ({ ...m.teams as Record<string, unknown>, role: m.role }));

      const teams = [
        ...(ownedTeams || []).map((t: Record<string, unknown>) => ({ ...t, role: 'owner' })),
        ...memberTeams,
      ];

      return new Response(JSON.stringify(teams), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name } = body;

      if (!name) {
        return new Response(JSON.stringify({ error: 'name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name, owner_id: userId })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add owner as admin member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: userId, role: 'admin' });

      if (memberError) throw memberError;

      return new Response(JSON.stringify(team), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, name } = body;

      if (!id || !name) {
        return new Response(JSON.stringify({ error: 'id and name are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
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
