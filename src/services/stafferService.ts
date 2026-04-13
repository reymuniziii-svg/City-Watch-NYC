import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Staffer, CommunicationLog } from '../lib/types';

export async function getStaffers(filters?: {
  district?: number;
  memberSlug?: string;
  policyArea?: string;
}): Promise<Staffer[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase!.from('staffers').select('*');

  if (filters?.district !== undefined) {
    query = query.eq('district_number', filters.district);
  }
  if (filters?.memberSlug) {
    query = query.eq('member_slug', filters.memberSlug);
  }
  if (filters?.policyArea) {
    query = query.contains('policy_areas', [filters.policyArea]);
  }

  query = query.order('district_number', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching staffers:', error);
    return [];
  }
  return data as Staffer[];
}

export async function getStaffersByMember(memberSlug: string): Promise<Staffer[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('staffers')
    .select('*')
    .eq('member_slug', memberSlug)
    .eq('verified', true);

  if (error) {
    console.error('Error fetching staffers by member:', error);
    return [];
  }
  return data as Staffer[];
}

export async function createStaffer(
  userId: string,
  staffer: Omit<Staffer, 'id' | 'verified' | 'submitted_by' | 'verified_by' | 'created_at' | 'updated_at'>
): Promise<Staffer> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const { data, error } = await supabase!
    .from('staffers')
    .insert({ ...staffer, submitted_by: userId })
    .select()
    .single();

  if (error) {
    console.error('Error creating staffer:', error);
    throw error;
  }
  return data as Staffer;
}

export async function updateStaffer(
  stafferId: string,
  updates: Partial<Staffer>
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('staffers')
    .update(updates)
    .eq('id', stafferId);

  if (error) {
    console.error('Error updating staffer:', error);
    throw error;
  }
}

export async function deleteStaffer(stafferId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('staffers')
    .delete()
    .eq('id', stafferId)
    .eq('submitted_by', userId);

  if (error) {
    console.error('Error deleting staffer:', error);
    throw error;
  }
}

export async function logCommunication(
  log: Omit<CommunicationLog, 'id' | 'created_at'>
): Promise<CommunicationLog> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const { data, error } = await supabase!
    .from('communication_logs')
    .insert(log)
    .select()
    .single();

  if (error) {
    console.error('Error logging communication:', error);
    throw error;
  }
  return data as CommunicationLog;
}

export async function getCommunicationLogs(
  stafferId: string,
  teamId: string
): Promise<CommunicationLog[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('communication_logs')
    .select('*')
    .eq('staffer_id', stafferId)
    .eq('team_id', teamId)
    .order('contact_date', { ascending: false });

  if (error) {
    console.error('Error fetching communication logs:', error);
    return [];
  }
  return data as CommunicationLog[];
}
