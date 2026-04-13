import { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { createStaffer, updateStaffer } from '../services/stafferService';
import type { Staffer } from '../lib/types';

interface StafferEditorProps {
  staffer?: Staffer;
  onSave: () => void;
  onCancel: () => void;
}

export default function StafferEditor({ staffer, onSave, onCancel }: StafferEditorProps) {
  const { user } = useProUser();
  const isEditing = !!staffer;

  const [fullName, setFullName] = useState(staffer?.full_name ?? '');
  const [title, setTitle] = useState(staffer?.title ?? '');
  const [email, setEmail] = useState(staffer?.email ?? '');
  const [phone, setPhone] = useState(staffer?.phone ?? '');
  const [districtNumber, setDistrictNumber] = useState<number>(staffer?.district_number ?? 1);
  const [memberSlug, setMemberSlug] = useState(staffer?.member_slug ?? '');
  const [policyAreasText, setPolicyAreasText] = useState(
    staffer?.policy_areas?.join(', ') ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim() || !title.trim()) {
      setError('Name and title are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const policyAreas = policyAreasText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (isEditing && staffer) {
        await updateStaffer(staffer.id, {
          full_name: fullName.trim(),
          title: title.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          district_number: districtNumber,
          member_slug: memberSlug.trim(),
          policy_areas: policyAreas,
        });
      } else {
        await createStaffer(user.id, {
          full_name: fullName.trim(),
          title: title.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          district_number: districtNumber,
          member_slug: memberSlug.trim(),
          policy_areas: policyAreas,
        });
      }
      onSave();
    } catch (err) {
      console.error('Error saving staffer:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-editorial p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-editorial text-2xl font-bold text-black">
          {isEditing ? 'Edit Staffer' : 'Add Staffer'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              District Number
            </label>
            <input
              type="number"
              min={1}
              max={51}
              value={districtNumber}
              onChange={(e) => setDistrictNumber(Number(e.target.value))}
              className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Member Slug
            </label>
            <input
              type="text"
              value={memberSlug}
              onChange={(e) => setMemberSlug(e.target.value)}
              placeholder="e.g. adrienne-adams"
              className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
            Policy Areas
          </label>
          <input
            type="text"
            value={policyAreasText}
            onChange={(e) => setPolicyAreasText(e.target.value)}
            placeholder="Housing, Education, Transit (comma-separated)"
            className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : isEditing ? 'Update Staffer' : 'Add Staffer'}
        </button>
      </form>
    </div>
  );
}
