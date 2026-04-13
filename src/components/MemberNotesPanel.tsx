import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { StickyNote, Pin, Trash2, Loader2, Send } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import {
  getMemberNotes,
  createMemberNote,
  updateMemberNote,
  deleteMemberNote,
} from '../services/institutionalMemoryService';
import { getUserTeamId } from '../services/teamService';
import type { MemberNote } from '../lib/types';

interface MemberNotesPanelProps {
  memberSlug: string;
}

export default function MemberNotesPanel({ memberSlug }: MemberNotesPanelProps) {
  const { user } = useProUser();

  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const tid = await getUserTeamId(user.id);
      if (cancelled) return;
      setTeamId(tid);

      if (tid) {
        const data = await getMemberNotes(memberSlug, tid);
        if (!cancelled) setNotes(data);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, memberSlug]);

  const handleAddNote = async () => {
    if (!user || !teamId || !newContent.trim()) return;

    setSubmitting(true);
    try {
      const note = await createMemberNote({
        team_id: teamId,
        member_slug: memberSlug,
        user_id: user.id,
        content: newContent.trim(),
        is_pinned: false,
      });
      setNotes((prev) => [note, ...prev]);
      setNewContent('');
    } catch (err) {
      console.error('Error creating note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (note: MemberNote) => {
    if (!user || note.user_id !== user.id) return;

    try {
      await updateMemberNote(note.id, note.content, !note.is_pinned);
      setNotes((prev) =>
        prev
          .map((n) => (n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n))
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleDelete = async (note: MemberNote) => {
    if (!user || note.user_id !== user.id) return;

    try {
      await deleteMemberNote(note.id, user.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border-editorial p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <StickyNote className="w-4 h-4 text-black" />
        <h3 className="font-editorial text-xl font-bold text-black">Team Notes</h3>
      </div>

      {/* Add note */}
      <div className="mb-5">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          placeholder="Add a note for your team..."
          className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black resize-none mb-2"
        />
        <button
          onClick={handleAddNote}
          disabled={submitting || !newContent.trim() || !teamId}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {submitting ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-black" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8">
          <StickyNote className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No team notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 border ${note.is_pinned ? 'border-black bg-slate-50' : 'border-slate-100 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-black leading-relaxed flex-1 whitespace-pre-wrap">
                  {note.content}
                </p>

                {user && note.user_id === user.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePin(note)}
                      className={`p-1.5 transition-colors ${
                        note.is_pinned
                          ? 'text-black'
                          : 'text-slate-300 hover:text-black'
                      }`}
                      title={note.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note)}
                      className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2">
                {note.is_pinned && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black">
                    Pinned
                  </span>
                )}
                <span className="text-[10px] text-slate-400">
                  {note.user_id.slice(0, 8)} &middot;{' '}
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
