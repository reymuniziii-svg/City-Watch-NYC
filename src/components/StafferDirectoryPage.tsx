import { useState, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown, UserPlus, Phone, Mail, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStaffers } from '../services/stafferService';
import ProGate from './ProGate';
import type { StafferRecord } from '../lib/types';

const POLICY_AREA_OPTIONS = [
  'Housing', 'Land Use', 'Finance', 'Education', 'Health',
  'Transportation', 'Public Safety', 'Labor', 'Environment',
  'Small Business', 'Technology', 'Immigration',
];

type SortKey = 'fullName' | 'districtNumber' | 'title';

function SortHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortKey;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === field;
  return (
    <th
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer select-none hover:text-black"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (sort.dir === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </span>
    </th>
  );
}

export default function StafferDirectoryPage() {
  const [staffers, setStaffers] = useState<StafferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'districtNumber',
    dir: 'asc',
  });
  const [contactStafferId, setContactStafferId] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffers()
      .then(setStaffers)
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  const districts = useMemo(
    () => Array.from(new Set(staffers.map((s) => s.districtNumber))).sort((a, b) => a - b),
    [staffers],
  );

  const filtered = useMemo(() => {
    let result = staffers;
    if (districtFilter) result = result.filter((s) => s.districtNumber === Number(districtFilter));
    if (policyFilter) result = result.filter((s) => s.policyAreas.includes(policyFilter));
    return [...result].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [staffers, districtFilter, policyFilter, sort]);

  return (
    <ProGate flag="canUseStafferDirectory" feature="Gatekeeper Directory">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-editorial text-4xl font-bold text-black">Gatekeeper Directory</h1>
          <p className="mt-2 text-lg text-slate-600">
            Verified legislative staffers across NYC Council offices. Who actually handles your issue.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="border-editorial bg-white px-3 py-2 text-sm"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                District {d}
              </option>
            ))}
          </select>
          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value)}
            className="border-editorial bg-white px-3 py-2 text-sm"
          >
            <option value="">All Policy Areas</option>
            {POLICY_AREA_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">{filtered.length} staffers</span>
        </div>

        {loading ? (
          <div className="border-editorial bg-white p-12 text-center">
            <p className="text-sm text-slate-500">Loading directory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-editorial bg-white p-12 text-center">
            <UserPlus className="mx-auto mb-4 h-8 w-8 text-slate-400" />
            <p className="font-bold text-black">No staffers found</p>
            <p className="mt-2 text-sm text-slate-500">
              The directory is being populated starting with the most active committees.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block border-editorial overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-editorial">
                  <tr>
                    <SortHeader label="District" field="districtNumber" sort={sort} onSort={handleSort} />
                    <SortHeader label="Name" field="fullName" sort={sort} onSort={handleSort} />
                    <SortHeader label="Title" field="title" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Policy Areas
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((staffer) => (
                    <tr key={staffer.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-editorial text-lg font-bold">
                        {staffer.districtNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-black">{staffer.fullName}</span>
                        {staffer.verified && (
                          <span className="ml-2 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{staffer.title}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {staffer.policyAreas.map((area) => (
                            <span
                              key={area}
                              className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {staffer.email && (
                            <a href={`mailto:${staffer.email}`} title="Email">
                              <Mail className="h-4 w-4 text-slate-400 hover:text-black" />
                            </a>
                          )}
                          {staffer.phone && (
                            <a href={`tel:${staffer.phone}`} title="Phone">
                              <Phone className="h-4 w-4 text-slate-400 hover:text-black" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setContactStafferId(staffer.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-black"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Log Contact
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {filtered.map((staffer) => (
                <div key={staffer.id} className="border-editorial bg-white p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-slate-500">District {staffer.districtNumber}</span>
                      <p className="font-medium text-black">{staffer.fullName}</p>
                      <p className="text-sm text-slate-600">{staffer.title}</p>
                    </div>
                    {staffer.verified && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {staffer.policyAreas.map((area) => (
                      <span key={area} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {area}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    {staffer.email && (
                      <a href={`mailto:${staffer.email}`} className="text-xs text-slate-500 hover:text-black">
                        Email
                      </a>
                    )}
                    {staffer.phone && (
                      <a href={`tel:${staffer.phone}`} className="text-xs text-slate-500 hover:text-black">
                        Call
                      </a>
                    )}
                    <button
                      onClick={() => setContactStafferId(staffer.id)}
                      className="text-xs font-bold text-slate-500 hover:text-black"
                    >
                      Log Contact
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Contact Log Modal */}
        <AnimatePresence>
          {contactStafferId && (
            <CommunicationLogModal
              stafferId={contactStafferId}
              onClose={() => setContactStafferId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </ProGate>
  );
}

function CommunicationLogModal({
  stafferId,
  onClose,
}: {
  stafferId: string;
  onClose: () => void;
}) {
  const [contactType, setContactType] = useState('email');
  const [summary, setSummary] = useState('');
  const [contactDate, setContactDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call addCommunicationLog service with auth token
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-md border-editorial bg-white p-6 shadow-lg"
      >
        <h3 className="font-editorial text-2xl font-bold text-black mb-4">Log Contact</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
              Contact Type
            </label>
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className="w-full border-editorial px-3 py-2 text-sm"
            >
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
              Date
            </label>
            <input
              type="date"
              value={contactDate}
              onChange={(e) => setContactDate(e.target.value)}
              className="w-full border-editorial px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
              Notes
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Summary of the interaction..."
              className="w-full border-editorial px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-black px-6 py-2 text-sm font-bold uppercase tracking-widest text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
