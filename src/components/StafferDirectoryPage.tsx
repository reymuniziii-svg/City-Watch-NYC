import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, Search, Plus, Loader2 } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { getStaffers } from '../services/stafferService';
import ProGate from './ProGate';
import StafferCard from './StafferCard';
import StafferEditor from './StafferEditor';
import CommunicationLogModal from './CommunicationLogModal';
import type { Staffer } from '../lib/types';

export default function StafferDirectoryPage() {
  const { user, isEnterprise } = useProUser();

  const [staffers, setStaffers] = useState<Staffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<number | ''>('');
  const [policyFilter, setPolicyFilter] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingStaffer, setEditingStaffer] = useState<Staffer | undefined>();
  const [logModalStaffer, setLogModalStaffer] = useState<Staffer | null>(null);

  const fetchStaffers = async () => {
    setLoading(true);
    const data = await getStaffers();
    setStaffers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaffers();
  }, []);

  // Derive unique districts and policy areas for filter dropdowns
  const districts = useMemo(() => {
    const set = new Set(staffers.map((s) => s.district_number));
    return Array.from(set).sort((a, b) => a - b);
  }, [staffers]);

  const policyAreas = useMemo(() => {
    const set = new Set(staffers.flatMap((s) => s.policy_areas));
    return Array.from(set).sort();
  }, [staffers]);

  // Filter staffers
  const filtered = useMemo(() => {
    return staffers.filter((s) => {
      if (districtFilter !== '' && s.district_number !== districtFilter) return false;
      if (policyFilter && !s.policy_areas.includes(policyFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) === true
        );
      }
      return true;
    });
  }, [staffers, districtFilter, policyFilter, searchQuery]);

  const handleEditorSave = () => {
    setShowEditor(false);
    setEditingStaffer(undefined);
    fetchStaffers();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-black" />
          <h1 className="font-editorial text-4xl font-bold text-black">Gatekeeper Directory</h1>
        </div>
      </div>
      <p className="text-slate-600 text-sm mb-8">
        Verified council member staffers and their policy portfolios. Search, filter, and log your contacts.
      </p>

      <ProGate feature="Staffer Directory" flag="canUseStafferDirectory">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, title, or email..."
              className="w-full pl-10 pr-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
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
            className="px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="">All Policy Areas</option>
            {policyAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {isEnterprise && (
            <button
              onClick={() => {
                setEditingStaffer(undefined);
                setShowEditor(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Staffer
            </button>
          )}
        </div>

        {/* Editor */}
        {showEditor && (
          <div className="mb-6">
            <StafferEditor
              staffer={editingStaffer}
              onSave={handleEditorSave}
              onCancel={() => {
                setShowEditor(false);
                setEditingStaffer(undefined);
              }}
            />
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {searchQuery || districtFilter !== '' || policyFilter
                ? 'No staffers match your filters.'
                : 'No staffers in the directory yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((staffer) => (
              <StafferCard
                key={staffer.id}
                staffer={staffer}
                onLogContact={() => setLogModalStaffer(staffer)}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6">
          {filtered.length} staffer{filtered.length !== 1 ? 's' : ''} shown
        </p>
      </ProGate>

      {/* Communication Log Modal */}
      {logModalStaffer && (
        <CommunicationLogModal
          stafferId={logModalStaffer.id}
          stafferName={logModalStaffer.full_name}
          isOpen={!!logModalStaffer}
          onClose={() => setLogModalStaffer(null)}
        />
      )}
    </motion.div>
  );
}
