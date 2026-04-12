import { callEdgeFunction } from './supabaseClient';
import type { MemberNote, DocumentVaultEntry } from '../lib/types';

export async function getMemberNotes(token: string, memberSlug: string): Promise<MemberNote[]> {
  return callEdgeFunction<MemberNote[]>(
    `member-notes?memberSlug=${encodeURIComponent(memberSlug)}`,
    { method: 'GET', token }
  );
}

export async function addMemberNote(token: string, memberSlug: string, content: string): Promise<MemberNote> {
  return callEdgeFunction<MemberNote>('member-notes', {
    method: 'POST',
    token,
    body: { memberSlug, content },
  });
}

export async function updateMemberNote(
  token: string,
  noteId: string,
  content: string,
  isPinned?: boolean
): Promise<void> {
  await callEdgeFunction('member-notes', {
    method: 'PUT',
    token,
    body: { id: noteId, content, ...(isPinned !== undefined && { isPinned }) },
  });
}

export async function deleteMemberNote(token: string, noteId: string): Promise<void> {
  await callEdgeFunction(`member-notes?id=${encodeURIComponent(noteId)}`, { method: 'DELETE', token });
}

export async function getDocuments(
  token: string,
  entityType: string,
  entityId: string
): Promise<DocumentVaultEntry[]> {
  return callEdgeFunction<DocumentVaultEntry[]>(
    `document-vault?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    { method: 'GET', token }
  );
}

export async function uploadDocument(
  token: string,
  entityType: string,
  entityId: string,
  file: File,
  description: string
): Promise<DocumentVaultEntry> {
  const formData = new FormData();
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);
  formData.append('description', description);
  formData.append('file', file);

  return callEdgeFunction<DocumentVaultEntry>('document-vault', {
    method: 'POST',
    token,
    formData,
  });
}

export async function deleteDocument(token: string, documentId: string): Promise<void> {
  await callEdgeFunction(`document-vault?id=${encodeURIComponent(documentId)}`, { method: 'DELETE', token });
}
