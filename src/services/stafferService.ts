import { callEdgeFunction } from './supabaseClient';
import type { StafferRecord, CommunicationLogEntry } from '../lib/types';

export async function fetchStaffers(districtNumber?: number): Promise<StafferRecord[]> {
  const query = districtNumber !== undefined ? `?district=${districtNumber}` : '';
  return callEdgeFunction<StafferRecord[]>(`staffers${query}`, { method: 'GET' });
}

export async function fetchStaffersByCommittee(committeeName: string): Promise<StafferRecord[]> {
  return callEdgeFunction<StafferRecord[]>(
    `staffers?committee=${encodeURIComponent(committeeName)}`,
    { method: 'GET' }
  );
}

export async function addStaffer(token: string, data: Partial<StafferRecord>): Promise<StafferRecord> {
  return callEdgeFunction<StafferRecord>('staffers', { method: 'POST', token, body: data });
}

export async function updateStaffer(token: string, id: string, data: Partial<StafferRecord>): Promise<void> {
  await callEdgeFunction('staffers', { method: 'PUT', token, body: { id, ...data } });
}

export async function deleteStaffer(token: string, id: string): Promise<void> {
  await callEdgeFunction(`staffers?id=${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

export async function fetchCommunicationLogs(token: string, stafferId: string): Promise<CommunicationLogEntry[]> {
  return callEdgeFunction<CommunicationLogEntry[]>(
    `communication-logs?stafferId=${encodeURIComponent(stafferId)}`,
    { method: 'GET', token }
  );
}

export async function addCommunicationLog(
  token: string,
  stafferId: string,
  log: { contactType: string; summary: string; contactDate: string }
): Promise<CommunicationLogEntry> {
  return callEdgeFunction<CommunicationLogEntry>('communication-logs', {
    method: 'POST',
    token,
    body: { stafferId, ...log },
  });
}
