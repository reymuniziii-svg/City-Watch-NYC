import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Palette,
  Link as LinkIcon,
  Megaphone,
  Save,
  Globe,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useProUser } from '../hooks/useProUser';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { fetchBills } from '../services/nycDataService';
import { createKit, updateKit, type ActionKit } from '../services/actionKitService';
import type { Bill } from '../types';
import ProGate from './ProGate';

interface ActionKitBuilderProps {
  editingKit?: ActionKit | null;
  onSaved?: (kit: ActionKit) => void;
  onCancel?: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function ActionKitBuilder({ editingKit, onSaved, onCancel }: ActionKitBuilderProps) {
  const { user } = useProUser();

  // Form state
  const [name, setName] = useState(editingKit?.name ?? '');
  const [slug, setSlug] = useState(editingKit?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>(editingKit?.bill_filter_ids ?? []);
  const [ctaType, setCtaType] = useState<'email' | 'call' | 'both'>(editingKit?.cta_type ?? 'email');
  const [primaryColor, setPrimaryColor] = useState<string>(
    (editingKit?.custom_branding?.primaryColor as string) ?? '#000000'
  );
  const [logoUrl, setLogoUrl] = useState<string>(
    (editingKit?.custom_branding?.logoUrl as string) ?? ''
  );

  // Data state
  const [bills, setBills] = useState<Bill[]>([]);
  const [billSearch, setBillSearch] = useState('');
  const [loadingBills, setLoadingBills] = useState(true);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBills()
      .then(setBills)
      .finally(() => setLoadingBills(false));
  }, []);

  // Pre-populate when editing
  useEffect(() => {
    if (editingKit) {
      setName(editingKit.name);
      setSlug(editingKit.slug);
      setSlugManuallyEdited(true);
      setSelectedBillIds(editingKit.bill_filter_ids ?? []);
      setCtaType(editingKit.cta_type);
      setPrimaryColor((editingKit.custom_branding?.primaryColor as string) ?? '#000000');
      setLogoUrl((editingKit.custom_branding?.logoUrl as string) ?? '');
    }
  }, [editingKit]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  const filteredBills = useMemo(() => {
    if (!billSearch.trim()) return bills.slice(0, 20);
    const q = billSearch.toLowerCase();
    return bills
      .filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.number.toLowerCase().includes(q) ||
          (b.introNumber && b.introNumber.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [bills, billSearch]);

  const selectedBills = useMemo(
    () => bills.filter((b) => selectedBillIds.includes(b.id)),
    [bills, selectedBillIds]
  );

  const toggleBill = (billId: string) => {
    setSelectedBillIds((prev) =>
      prev.includes(billId) ? prev.filter((id) => id !== billId) : [...prev, billId]
    );
  };

  const removeBill = (billId: string) => {
    setSelectedBillIds((prev) => prev.filter((id) => id !== billId));
  };

  const handleSave = async (publish: boolean) => {
    if (!user || !name.trim() || !slug.trim()) return;
    setSaving(true);
    setSaveError(null);
    setPublishedUrl(null);

    const kitData: Partial<ActionKit> = {
      name: name.trim(),
      slug: slug.trim(),
      bill_filter_ids: selectedBillIds,
      custom_branding: { primaryColor, logoUrl: logoUrl.trim() || undefined },
      cta_type: ctaType,
      status: publish ? 'published' : 'draft',
    };

    try {
      if (editingKit) {
        await updateKit(user.id, editingKit.id, kitData);
        if (publish) setPublishedUrl(`${window.location.origin}/kit/${slug}`);
        onSaved?.({ ...editingKit, ...kitData, user_id: user.id } as ActionKit);
      } else {
        const created = await createKit(user.id, kitData);
        if (publish) setPublishedUrl(`${window.location.origin}/kit/${slug}`);
        onSaved?.(created);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save action kit');
    } finally {
      setSaving(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Action Kit Builder</h2>
        <p className="text-slate-600">
          Action Kits require a connected backend. Please configure Supabase to enable this feature.
        </p>
      </div>
    );
  }

  return (
    <ProGate flag="canCreateActionKits" feature="Action Kit Builder">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="w-6 h-6 text-black" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enterprise</span>
          </div>
          <h2 className="font-editorial text-4xl md:text-5xl font-black text-black tracking-tighter leading-none mb-2">
            {editingKit ? 'Edit Action Kit' : 'New Action Kit'}
          </h2>
          <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
            Build a branded campaign page for your advocacy coalition. Select bills, customize branding, and share a
            public link.
          </p>
        </div>

        {/* Name & Slug */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border-editorial p-6 space-y-5"
        >
          <div className="flex items-center gap-3 mb-1">
            <LinkIcon className="w-4 h-4 text-black" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Identity</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Kit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Housing Justice Coalition"
              className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 shrink-0">/kit/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugManuallyEdited(true);
                }}
                placeholder="housing-justice-coalition"
                className="flex-1 px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
              />
            </div>
            {slug && (
              <p className="text-xs text-slate-400 mt-2">
                Preview: {window.location.origin}/kit/{slug}
              </p>
            )}
          </div>
        </motion.div>

        {/* Bill Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-editorial p-6 space-y-5"
        >
          <div className="flex items-center gap-3 mb-1">
            <FileText className="w-4 h-4 text-black" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bills</span>
          </div>

          {/* Selected bills chips */}
          {selectedBills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedBills.map((bill) => (
                <span
                  key={bill.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-widest"
                >
                  {bill.introNumber || bill.number}
                  <button
                    onClick={() => removeBill(bill.id)}
                    className="ml-1 hover:text-slate-300 transition-colors"
                    aria-label={`Remove ${bill.introNumber || bill.number}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              placeholder="Search bills by title or number..."
              className="w-full pl-10 pr-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
            />
          </div>

          {/* Bill list */}
          <div className="max-h-64 overflow-y-auto border-editorial divide-y divide-slate-100">
            {loadingBills ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-black animate-spin" />
              </div>
            ) : filteredBills.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No bills found.</p>
            ) : (
              filteredBills.map((bill) => {
                const isSelected = selectedBillIds.includes(bill.id);
                return (
                  <button
                    key={bill.id}
                    onClick={() => toggleBill(bill.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 border-2 shrink-0 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-black border-black' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">
                        {bill.introNumber || bill.number}
                      </span>
                      <span className="text-sm text-slate-700 line-clamp-2">{bill.title}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <p className="text-xs text-slate-400">
            {selectedBillIds.length} bill{selectedBillIds.length !== 1 ? 's' : ''} selected
          </p>
        </motion.div>

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border-editorial p-6 space-y-5"
        >
          <div className="flex items-center gap-3 mb-1">
            <Palette className="w-4 h-4 text-black" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Branding</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 border-editorial cursor-pointer"
                />
                <span className="text-sm text-slate-600 font-mono">{primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Logo URL
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.org/logo.png"
                className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Branding Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Preview</label>
            <div className="border-editorial p-6" style={{ borderLeftColor: primaryColor, borderLeftWidth: '4px' }}>
              <div className="flex items-center gap-3 mb-3">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="font-editorial text-xl font-bold" style={{ color: primaryColor }}>
                  {name || 'Your Kit Name'}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {selectedBillIds.length} bill{selectedBillIds.length !== 1 ? 's' : ''} tracked
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Type */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border-editorial p-6 space-y-5"
        >
          <div className="flex items-center gap-3 mb-1">
            <Megaphone className="w-4 h-4 text-black" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Call to Action</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {(['email', 'call', 'both'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCtaType(type)}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                  ctaType === type
                    ? 'bg-black text-white'
                    : 'border-editorial text-black hover:bg-slate-50'
                }`}
              >
                {type === 'both' ? 'Email & Call' : type === 'email' ? 'Email' : 'Call'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Error / Success */}
        {saveError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 p-4">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        {publishedUrl && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 p-4">
            <Globe className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm text-green-800 font-bold">Published!</p>
              <p className="text-sm text-green-700 break-all">{publishedUrl}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center gap-4"
        >
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !name.trim() || !slug.trim()}
            className="flex items-center gap-2 px-8 py-3 border-editorial text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving || !name.trim() || !slug.trim()}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Publish
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="px-8 py-3 text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
            >
              Cancel
            </button>
          )}
        </motion.div>
      </motion.div>
    </ProGate>
  );
}
