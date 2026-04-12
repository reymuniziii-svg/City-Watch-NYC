import { useState, useEffect, useCallback } from 'react';
import { Plus, Pin, Pencil, Trash2, Check, X } from 'lucide-react';
import { useSession } from '@clerk/clerk-react';
import { getMemberNotes, addMemberNote, updateMemberNote, deleteMemberNote } from '../services/institutionalMemoryService';
import type { MemberNote } from '../lib/types';

async function getToken(session: ReturnType<typeof useSession>['session']): Promise<string | null> {
  if (!session) return null;
  return session.getToken();
}

export default function MemberNotesPanel({ memberSlug }: { memberSlug: string }) {
  const { session } = useSession();
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!session) return;
    session.getToken().then((token) => {
      if (!token) return;
      getMemberNotes(token, memberSlug)
        .then(setNotes)
        .catch(() => setNotes([]))
        .finally(() => setLoading(false));
    });
  }, [session, memberSlug]);

  const handleAdd = useCallback(async () => {
    const token = await getToken(session);
    if (!token || !newNote.trim()) return;
    const note = await addMemberNote(token, memberSlug, newNote.trim());
    setNotes((prev) => [note, ...prev]);
    setNewNote('');
  }, [session, memberSlug, newNote]);

  const handleUpdate = useCallback(async (noteId: string) => {
    const token = await getToken(session);
    if (!token || !editContent.trim()) return;
    await updateMemberNote(token, noteId, editContent.trim());
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content: editContent.trim(), updatedAt: new Date().toISOString() } : n)),
    );
    setEditingId(null);
  }, [session, editContent]);

  const handleTogglePin = useCallback(async (note: MemberNote) => {
    const token = await getToken(session);
    if (!token) return;
    await updateMemberNote(token, note.id, note.content, !note.isPinned);
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, isPinned: !n.isPinned } : n)),
    );
  }, [session]);

  const handleDelete = useCallback(async (noteId: string) => {
    const token = await getToken(session);
    if (!token) return;
    await deleteMemberNote(token, noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, [session]);

  const sorted = [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return <p className="text-sm text-slate-500 p-4">Loading team notes...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-editorial text-2xl font-bold text-black">Team Notes</h3>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {notes.length} notes
        </span>
      </div>

      <div className="border-editorial bg-white p-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a private note about this member..."
          rows={3}
          className="w-full border-editorial px-3 py-2 text-sm resize-none mb-3"
        />
        <button
          onClick={handleAdd}
          disabled={!newNote.trim()}
          className="inline-flex items-center gap-2 bg-black px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3 w-3" />
          Add Note
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((note) => (
          <div
            key={note.id}
            className={`border-editorial bg-white p-4 ${note.isPinned ? 'border-l-4 border-l-black' : ''}`}
          >
            {editingId === note.id ? (
              <div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full border-editorial px-3 py-2 text-sm resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(note.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800"
                  >
                    <Check className="h-3 w-3" /> Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-black"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {note.userName} &middot;{' '}
                    {new Date(note.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePin(note)}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                      className={`text-slate-400 hover:text-black ${note.isPinned ? 'text-black' : ''}`}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                      className="text-slate-400 hover:text-black"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="border-editorial bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            No team notes yet. Add private intelligence that only your organization can see.
          </p>
        </div>
      )}
    </div>
  );
}
