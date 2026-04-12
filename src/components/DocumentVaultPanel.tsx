import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { useSession } from '@clerk/clerk-react';
import { getDocuments, uploadDocument, deleteDocument } from '../services/institutionalMemoryService';
import type { DocumentVaultEntry } from '../lib/types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentVaultPanel({
  entityType,
  entityId,
}: {
  entityType: 'bill' | 'member' | 'hearing';
  entityId: string;
}) {
  const { session } = useSession();
  const [documents, setDocuments] = useState<DocumentVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) return;
    session.getToken().then((token) => {
      if (!token) return;
      getDocuments(token, entityType, entityId)
        .then(setDocuments)
        .catch(() => setDocuments([]))
        .finally(() => setLoading(false));
    });
  }, [session, entityType, entityId]);

  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!session || !file) return;
    const token = await session.getToken();
    if (!token) return;

    setUploading(true);
    try {
      const doc = await uploadDocument(token, entityType, entityId, file, description);
      setDocuments((prev) => [doc, ...prev]);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  }, [session, entityType, entityId, description]);

  const handleDelete = useCallback(async (docId: string) => {
    if (!session) return;
    const token = await session.getToken();
    if (!token) return;
    await deleteDocument(token, docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, [session]);

  if (loading) {
    return <p className="text-sm text-slate-500 p-4">Loading documents...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-editorial text-2xl font-bold text-black">Document Vault</h3>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {documents.length} files
        </span>
      </div>

      {/* Upload form */}
      <div className="border-editorial bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
              File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
              className="w-full text-sm text-slate-600 file:mr-4 file:border-editorial file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-black file:cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full border-editorial px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-black px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Documents list */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="border-editorial bg-white p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="font-medium text-black truncate">{doc.filename}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(doc.sizeBytes)} &middot;{' '}
                  {new Date(doc.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {doc.description && ` — ${doc.description}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a
                href={doc.storagePath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-black"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-slate-400 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="border-editorial bg-white p-8 text-center">
          <Upload className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            Upload draft testimony, memos, or analysis. Only your team can see these.
          </p>
        </div>
      )}
    </div>
  );
}
