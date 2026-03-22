import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Filter, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CouncilMember } from '../types';
import { fetchMembers } from '../services/nycDataService';

export default function MemberList() {
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMembers().then(data => {
      setMembers(data);
      setIsLoading(false);
    });
  }, []);

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.borough?.toLowerCase().includes(search.toLowerCase()) ||
    m.neighborhoods?.some(n => n.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Council Members</h1>
          <p className="text-slate-500">Browse all 51 members of the New York City Council.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, borough, or neighborhood..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link 
              to={`/members/${member.id}`}
              className="group block bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm">
                  <img 
                    src={member.photoUrl || `https://picsum.photos/seed/${member.id}/200/200`} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{member.name}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                    <span>District {member.district}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{member.party}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                  <span className="line-clamp-2">{member.neighborhoods.join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Bills</p>
                    <p className="text-lg font-black text-slate-900 leading-none">{member.sponsoredBillsCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Enacted</p>
                    <p className="text-lg font-black text-emerald-600 leading-none">{member.enactedBillsCount}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
          <p className="text-slate-500">No members found matching your search.</p>
        </div>
      )}
    </div>
  );
}
