import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { MemberNote, DocumentVaultItem } from '../lib/types';

export async function getMemberNotes(
  memberSlug: string,
  teamId: string
): Promise<MemberNote[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('member_notes')
    .select('*')
    .eq('member_slug', memberSlug)
    .eq('team_id', teamId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching member notes:', error);
    return [];
  }
  return data as MemberNote[];
}

export async function createMemberNote(
  note: Omit<MemberNote, 'id' | 'created_at' | 'updated_at'>
): Promise<MemberNote> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const { data, error } = await supabase!
    .from('member_notes')
    .insert(note)
    .select()
    .single();

  if (error) {
    console.error('Error creating member note:', error);
    throw error;
  }
  return data as MemberNote;
}

export async function updateMemberNote(
  noteId: string,
  content: string,
  isPinned?: boolean
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const updates: Record<string, unknown> = { content };
  if (isPinned !== undefined) {
    updates.is_pinned = isPinned;
  }

  const { error } = await supabase!
    .from('member_notes')
    .update(updates)
    .eq('id', noteId);

  if (error) {
    console.error('Error updating member note:', error);
    throw error;
  }
}

export async function deleteMemberNote(noteId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('member_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting member note:', error);
    throw error;
  }
}

export async function getDocuments(
  entityType: string,
  entityId: string,
  teamId: string
): Promise<DocumentVaultItem[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('document_vault')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data as DocumentVaultItem[];
}

export async function uploadDocument(
  doc: Omit<DocumentVaultItem, 'id' | 'created_at'>
): Promise<DocumentVaultItem> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const { data, error } = await supabase!
    .from('document_vault')
    .insert(doc)
    .select()
    .single();

  if (error) {
    console.error('Error uploading document metadata:', error);
    throw error;
  }
  return data as DocumentVaultItem;
}

export async function deleteDocument(docId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // Fetch the document to get the storage path
  const { data: doc, error: fetchError } = await supabase!
    .from('document_vault')
    .select('storage_path')
    .eq('id', docId)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching document for deletion:', fetchError);
    throw fetchError;
  }

  // Delete the file from storage
  const { error: storageError } = await supabase!
    .storage
    .from('document-vault')
    .remove([doc.storage_path]);

  if (storageError) {
    console.error('Error deleting document from storage:', storageError);
    throw storageError;
  }

  // Delete the metadata row
  const { error: deleteError } = await supabase!
    .from('document_vault')
    .delete()
    .eq('id', docId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting document metadata:', deleteError);
    throw deleteError;
  }
}
