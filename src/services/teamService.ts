import { callEdgeFunction } from './supabaseClient';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'admin' | 'member';
  userName: string;
  joinedAt: string;
}

export async function getMyTeam(token: string): Promise<Team | null> {
  return callEdgeFunction<Team | null>('teams', { method: 'GET', token });
}

export async function createTeam(token: string, name: string): Promise<Team> {
  return callEdgeFunction<Team>('teams', { method: 'POST', token, body: { name } });
}

export async function inviteTeamMember(token: string, teamId: string, email: string): Promise<void> {
  await callEdgeFunction('team-members', { method: 'POST', token, body: { teamId, email } });
}

export async function getTeamMembers(token: string, teamId: string): Promise<TeamMember[]> {
  return callEdgeFunction<TeamMember[]>(
    `team-members?teamId=${encodeURIComponent(teamId)}`,
    { method: 'GET', token }
  );
}

export async function removeTeamMember(token: string, memberId: string): Promise<void> {
  await callEdgeFunction(`team-members?id=${encodeURIComponent(memberId)}`, { method: 'DELETE', token });
}
