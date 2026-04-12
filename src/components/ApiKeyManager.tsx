import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { listApiKeys, createApiKey, revokeApiKey } from '../services/apiKeyService';
import type { ApiKey, NewApiKey } from '../services/apiKeyService';
import ProGate from './ProGate';

export default function ApiKeyManager() {
  const { user } = useProUser();
  const { session } = useSession();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const loadKeys = async () => {
    if (!user || !session) return;
    try {
      const token = await session.getToken();
      if (!token) return;
      const data = await listApiKeys(token);
      setKeys(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [user?.id, session]);

  const handleCreate = async () => {
    if (!user || !session || !newLabel.trim()) return;
    setCreating(true);
    try {
      const token = await session.getToken();
      if (!token) throw new Error('No session token');
      const key = await createApiKey(token, newLabel.trim());
      setNewKey(key);
      setNewLabel('');
      setShowCreate(false);
      await loadKeys();
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!user || !session) return;
    setRevoking(keyId);
    try {
      const token = await session.getToken();
      if (!token) throw new Error('No session token');
      await revokeApiKey(token, keyId);
      setConfirmRevoke(null);
      await loadKeys();
    } catch {
      // handle error
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-black" />
          <h2 className="font-editorial text-3xl font-bold text-black">API Keys</h2>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewKey(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Generate New Key
        </button>
      </div>

      <ProGate feature="Enterprise API" flag="canAccessAPI">
        {/* New Key Banner */}
        {newKey && (
          <div className="mb-6 bg-amber-50 border-editorial p-6">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-black">API Key Generated</p>
                <p className="text-xs text-slate-600 mt-1">
                  Copy this key now. It will not be shown again.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white border-editorial p-3">
              <code className="flex-1 text-xs font-mono break-all text-black">{newKey.key}</code>
              <button
                onClick={() => handleCopy(newKey.key)}
                className="flex-shrink-0 p-2 hover:bg-slate-100 transition-colors"
                aria-label="Copy API key"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-black" />}
              </button>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreate && !newKey && (
          <div className="mb-6 bg-white border-editorial p-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">New API Key</p>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Key label (e.g., Production, Staging)"
              className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 border-editorial bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newLabel.trim()}
                className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {creating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Keys Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          </div>
        ) : keys.length === 0 ? (
          <div className="bg-white border-editorial p-8 text-center">
            <Key className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No API keys yet. Generate one to get started.</p>
          </div>
        ) : (
          <div className="bg-white border-editorial overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-editorial">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Prefix</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Label</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Created</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Last Used</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-black">{k.key_prefix}...</td>
                    <td className="px-4 py-3 text-xs text-black">{k.label ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {k.last_used_at
                        ? new Date(k.last_used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      {k.revoked_at ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">Revoked</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-700">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!k.revoked_at && (
                        confirmRevoke === k.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-red-600">Confirm?</span>
                            <button
                              onClick={() => handleRevoke(k.id)}
                              disabled={revoking === k.id}
                              className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-800"
                            >
                              {revoking === k.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmRevoke(null)}
                              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRevoke(k.id)}
                            className="p-1 hover:bg-slate-100 transition-colors"
                            aria-label="Revoke key"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ProGate>
    </motion.div>
  );
}
