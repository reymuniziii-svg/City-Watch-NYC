import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Team, TeamMember } from '../lib/types';

export async function getTeams(userId: string): Promise<Team[]> {
  if (!isSupabaseConfigured()) return [];

  const { data: memberRows, error: memberError } = await supabase!
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (memberError) {
    console.error('Error fetching user team memberships:', memberError);
    return [];
  }

  const teamIds = (memberRows ?? []).map((r: { team_id: string }) => r.team_id);

  const { data: ownedTeams, error: ownedError } = await supabase!
    .from('teams')
    .select('*')
    .eq('owner_id', userId);

  if (ownedError) {
    console.error('Error fetching owned teams:', ownedError);
    return [];
  }

  const ownedIds = new Set((ownedTeams ?? []).map((t: Team) => t.id));
  const memberOnlyIds = teamIds.filter((id: string) => !ownedIds.has(id));

  if (memberOnlyIds.length === 0) {
    return (ownedTeams ?? []) as Team[];
  }

  const { data: memberTeams, error: memberTeamsError } = await supabase!
    .from('teams')
    .select('*')
    .in('id', memberOnlyIds);

  if (memberTeamsError) {
    console.error('Error fetching member teams:', memberTeamsError);
    return (ownedTeams ?? []) as Team[];
  }

  return [...(ownedTeams ?? []), ...(memberTeams ?? [])] as Team[];
}

export async function createTeam(userId: string, name: string): Promise<Team> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const { data, error } = await supabase!
    .from('teams')
    .insert({ name, owner_id: userId })
    .select()
    .single();

  if (error) {
    console.error('Error creating team:', error);
    throw error;
  }

  const { error: memberError } = await supabase!
    .from('team_members')
    .insert({ team_id: data.id, user_id: userId, role: 'admin' });

  if (memberError) {
    console.error('Error adding owner as admin:', memberError);
    throw memberError;
  }

  return data as Team;
}

export async function updateTeam(teamId: string, name: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('teams')
    .update({ name })
    .eq('id', teamId);

  if (error) {
    console.error('Error updating team:', error);
    throw error;
  }
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('team_members')
    .select('*')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
  return data as TeamMember[];
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role });

  if (error) {
    console.error('Error adding team member:', error);
    throw error;
  }
}

export async function removeTeamMember(memberId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}

export async function getUserTeamId(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase!
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user team id:', error);
    return null;
  }
  return data?.team_id ?? null;
}
