import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Loader2,
  Save,
  Send,
  ArrowLeft,
  FileText,
  X,
  Plus,
  Building2,
  Type,
  AlignLeft,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { createKit, updateKit, getUserKits } from '../services/actionKitService';
import type { ActionKit } from '../services/actionKitService';

interface BillIndexEntry {
  billId: string;
  introNumber: string;
  title: string;
  leadSponsorSlug: string;
  statusBucket: string;
}

interface ActionKitBuilderProps {
  kitId?: string;
}

export default function ActionKitBuilder({ kitId }: ActionKitBuilderProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useProUser();
  const { session } = useSession();

  const isEditMode = !!kitId;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orgName, setOrgName] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [targetMembers, setTargetMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');

  // Data state
  const [billsIndex, setBillsIndex] = useState<BillIndexEntry[]>([]);
  const [billSearch, setBillSearch] = useState('');
  const [billDropdownOpen, setBillDropdownOpen] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load bills index
  useEffect(() => {
    fetch('/data/bills-index.json')
      .then((res) => res.json())
      .then((data: BillIndexEntry[]) => setBillsIndex(data))
      .catch(() => setBillsIndex([]))
      .finally(() => {
        if (!isEditMode) setLoading(false);
      });
  }, [isEditMode]);

  // Load existing kit for edit mode
  useEffect(() => {
    if (!isEditMode || !session || !isAuthenticated) return;
    session
      .getToken()
      .then(async (token) => {
        if (!token) return;
        const kits = await getUserKits(token);
        const kit = kits.find((k) => k.id === kitId);
        if (kit) {
          setTitle(kit.title);
          setDescription(kit.description ?? '');
          setOrgName(kit.org_name ?? '');
          setCallToAction(kit.call_to_action ?? '');
          setSelectedBills(kit.bill_numbers);
          setTargetMembers(kit.target_members);
        }
      })
      .catch(() => setError('Failed to load action kit'))
      .finally(() => setLoading(false));
  }, [isEditMode, kitId, session, isAuthenticated]);

  // Filter bills for dropdown
  const filteredBills = useMemo(() => {
    if (!billSearch.trim()) return billsIndex.slice(0, 20);
    const q = billSearch.toLowerCase();
    return billsIndex
      .filter(
        (b) =>
          b.introNumber.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [billsIndex, billSearch]);

  // Get selected bill details
  const selectedBillDetails = useMemo(() => {
    return selectedBills
      .map((num) => billsIndex.find((b) => b.introNumber === num))
      .filter(Boolean) as BillIndexEntry[];
  }, [selectedBills, billsIndex]);

  // Auto-populate target members from bill sponsors
  const sponsorSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const bill of selectedBillDetails) {
      if (bill.leadSponsorSlug) slugs.add(bill.leadSponsorSlug);
    }
    return Array.from(slugs);
  }, [selectedBillDetails]);

  const handleAddBill = (introNumber: string) => {
    if (!selectedBills.includes(introNumber)) {
      setSelectedBills((prev) => [...prev, introNumber]);
    }
    setBillSearch('');
    setBillDropdownOpen(false);
  };

  const handleRemoveBill = (introNumber: string) => {
    setSelectedBills((prev) => prev.filter((b) => b !== introNumber));
  };

  const handleAddMember = () => {
    const slug = memberInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (slug && !targetMembers.includes(slug)) {
      setTargetMembers((prev) => [...prev, slug]);
    }
    setMemberInput('');
  };

  const handleRemoveMember = (slug: string) => {
    setTargetMembers((prev) => prev.filter((m) => m !== slug));
  };

  const handleAutoAddSponsors = () => {
    setTargetMembers((prev) => {
      const combined = new Set([...prev, ...sponsorSlugs]);
      return Array.from(combined);
    });
  };

  const handleSave = async (publish: boolean) => {
    if (!session || !title.trim()) return;
    const setter = publish ? setPublishing : setSaving;
    setter(true);
    setError(null);

    try {
      const token = await session.getToken();
      if (!token) return;

      const kitData = {
        title: title.trim(),
        description: description.trim() || undefined,
        org_name: orgName.trim() || undefined,
        call_to_action: callToAction.trim() || undefined,
        bill_numbers: selectedBills,
        target_members: targetMembers,
      };

      if (isEditMode && kitId) {
        await updateKit(token, {
          id: kitId,
          ...kitData,
          ...(publish ? { status: 'published' as const } : {}),
        });
      } else {
        await createKit(token, kitData);
      }

      navigate('/action-kits');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setter(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/action-kits')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-black transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Action Kits
        </button>
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {isEditMode ? 'Edit Kit' : 'New Kit'}
          </span>
        </div>
        <h1 className="font-editorial text-4xl md:text-5xl font-black text-black tracking-tighter leading-none">
          {isEditMode ? 'Edit Action Kit' : 'Create Action Kit'}
        </h1>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-6"
        >
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              <Type className="w-3.5 h-3.5" />
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Support the Clean Air Act"
              className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              <AlignLeft className="w-3.5 h-3.5" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this action kit..."
              rows={4}
              className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400 resize-y"
            />
          </div>

          {/* Organization Name */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
              className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
            />
          </div>

          {/* Bills */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              <FileText className="w-3.5 h-3.5" />
              Bills
            </label>

            {/* Selected bills */}
            {selectedBills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedBillDetails.map((bill) => (
                  <span
                    key={bill.introNumber}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border-editorial text-xs font-bold uppercase tracking-widest bg-white"
                  >
                    {bill.introNumber}
                    <button
                      onClick={() => handleRemoveBill(bill.introNumber)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Bill search */}
            <div className="relative">
              <input
                type="text"
                value={billSearch}
                onChange={(e) => {
                  setBillSearch(e.target.value);
                  setBillDropdownOpen(true);
                }}
                onFocus={() => setBillDropdownOpen(true)}
                placeholder="Search bills by number or title..."
                className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
              />
              {billDropdownOpen && filteredBills.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border-editorial max-h-60 overflow-y-auto shadow-lg mt-1">
                  {filteredBills.map((bill) => (
                    <button
                      key={bill.introNumber}
                      onClick={() => handleAddBill(bill.introNumber)}
                      disabled={selectedBills.includes(bill.introNumber)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-100 last:border-0"
                    >
                      <span className="font-bold text-black">{bill.introNumber}</span>
                      <span className="text-slate-500 ml-2 line-clamp-1">{bill.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {billDropdownOpen && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setBillDropdownOpen(false)}
              />
            )}
          </div>

          {/* Call to Action */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              Call to Action Text
            </label>
            <textarea
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              placeholder="Tell supporters what you'd like them to do..."
              rows={3}
              className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400 resize-y"
            />
          </div>

          {/* Target Members */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Target Council Members
            </label>

            {sponsorSlugs.length > 0 && sponsorSlugs.some((s) => !targetMembers.includes(s)) && (
              <button
                onClick={handleAutoAddSponsors}
                className="mb-3 text-xs text-slate-500 hover:text-black transition-colors underline"
              >
                Auto-add bill sponsors ({sponsorSlugs.length})
              </button>
            )}

            {targetMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {targetMembers.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-xs font-bold uppercase tracking-widest"
                  >
                    {slug}
                    <button
                      onClick={() => handleRemoveMember(slug)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                placeholder="Member slug, e.g. julie-menin"
                className="flex-1 px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
              />
              <button
                onClick={handleAddMember}
                disabled={!memberInput.trim()}
                className="flex items-center gap-2 px-4 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || publishing || !title.trim()}
              className="flex items-center gap-2 px-6 py-3 border-editorial text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || publishing || !title.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish
            </button>
          </div>
        </motion.div>

        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            Live Preview
          </p>
          <div className="border-editorial bg-white p-6 space-y-4 sticky top-8">
            {orgName && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {orgName}
              </p>
            )}
            <h2 className="font-editorial text-2xl font-bold text-black">
              {title || 'Your Action Kit Title'}
            </h2>
            {description && <p className="text-sm text-slate-600 leading-relaxed">{description}</p>}

            {selectedBillDetails.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Related Bills
                </p>
                {selectedBillDetails.map((bill) => (
                  <div key={bill.introNumber} className="flex items-start gap-2 text-sm">
                    <span className="font-bold text-black shrink-0">{bill.introNumber}</span>
                    <span className="text-slate-600 line-clamp-1">{bill.title}</span>
                  </div>
                ))}
              </div>
            )}

            {callToAction && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Call to Action
                </p>
                <p className="text-sm text-slate-700">{callToAction}</p>
              </div>
            )}

            {/* Preview form */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Supporter Form Preview
              </p>
              <div className="space-y-2">
                <div className="h-10 bg-slate-50 border border-slate-200 flex items-center px-3 text-xs text-slate-400">
                  Name
                </div>
                <div className="h-10 bg-slate-50 border border-slate-200 flex items-center px-3 text-xs text-slate-400">
                  Email
                </div>
                <div className="h-10 bg-slate-50 border border-slate-200 flex items-center px-3 text-xs text-slate-400">
                  ZIP Code
                </div>
              </div>
              <div className="h-10 bg-black flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest">
                Email Your Council Member
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
