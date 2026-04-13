import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { FileBox, Upload, Trash2, Loader2, File } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { getDocuments, uploadDocument, deleteDocument } from '../services/institutionalMemoryService';
import { getUserTeamId } from '../services/teamService';
import { supabase } from '../services/supabaseClient';
import type { DocumentVaultItem } from '../lib/types';

interface DocumentVaultPanelProps {
  entityType: 'bill' | 'member' | 'hearing';
  entityId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentVaultPanel({ entityType, entityId }: DocumentVaultPanelProps) {
  const { user } = useProUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

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
        const data = await getDocuments(entityType, entityId, tid);
        if (!cancelled) setDocuments(data);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, entityType, entityId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !teamId) return;

    setUploading(true);
    try {
      const storagePath = `${entityType}/${entityId}/${file.name}`;

      // Upload to Supabase Storage
      const { error } = await supabase!.storage.from('document-vault').upload(storagePath, file);
      if (error) throw error;

      // Create metadata row
      const doc = await uploadDocument({
        team_id: teamId,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        filename: file.name,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        description: description.trim() || null,
      });

      setDocuments((prev) => [doc, ...prev]);
      setDescription('');

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentVaultItem) => {
    if (!user || doc.user_id !== user.id) return;

    try {
      await deleteDocument(doc.id, user.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white border-editorial p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <FileBox className="w-4 h-4 text-black" />
        <h3 className="font-editorial text-xl font-bold text-black">Document Vault</h3>
      </div>

      {/* Upload area */}
      <div className="mb-5 space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the file..."
            className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="vault-file-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !teamId}
          className="flex items-center gap-2 px-4 py-2.5 border-editorial bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white active:scale-95 transition-all disabled:opacity-50 w-full justify-center"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-black" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <FileBox className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <File className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-black truncate">{doc.filename}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{formatBytes(doc.size_bytes)}</span>
                    <span>&middot;</span>
                    <span>
                      {new Date(doc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {doc.description && (
                      <>
                        <span>&middot;</span>
                        <span className="truncate">{doc.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {user && doc.user_id === user.id && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 text-slate-300 hover:text-red-600 transition-colors shrink-0"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
