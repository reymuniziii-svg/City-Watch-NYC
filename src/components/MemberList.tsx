import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Filter, MapPin, ChevronRight, Loader2, UsersRound } from 'lucide-react';
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
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-editorial pb-6">
          <div>
            <div className="h-16 w-80 bg-slate-200 animate-pulse mb-2"></div>
            <div className="h-6 w-96 bg-slate-200 animate-pulse"></div>
          </div>
          <div className="w-full md:w-80 h-12 bg-slate-200 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-editorial bg-black gap-[1px]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-8 animate-pulse">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 bg-slate-200"></div>
                <div className="flex-1">
                  <div className="h-8 w-3/4 bg-slate-200 mb-2"></div>
                  <div className="h-4 w-1/2 bg-slate-200"></div>
                </div>
              </div>
              <div className="h-4 w-full bg-slate-200 mb-2"></div>
              <div className="h-4 w-2/3 bg-slate-200 mb-8"></div>
              <div className="flex items-center justify-between pt-6 border-t-editorial">
                <div className="flex gap-6">
                  <div>
                    <div className="h-3 w-10 bg-slate-200 mb-2"></div>
                    <div className="h-8 w-12 bg-slate-200"></div>
                  </div>
                  <div>
                    <div className="h-3 w-12 bg-slate-200 mb-2"></div>
                    <div className="h-8 w-12 bg-slate-200"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

    return (
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-editorial pb-6">
          <div>
            <h1 className="font-editorial text-5xl md:text-6xl font-black text-black tracking-tighter mb-2">Council Members</h1>
            <p className="text-slate-600 text-lg">Browse all 51 members of the New York City Council.</p>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Search by name, borough, or neighborhood..."
              className="w-full pl-12 pr-4 py-3 bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all rounded-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-editorial bg-black gap-[1px]">
          {filteredMembers.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white"
            >
              <Link 
                to={`/members/${member.id}`}
                className="group block h-full p-8 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-20 h-20 overflow-hidden border-editorial">
                    <img 
                      src={member.photoUrl || `https://picsum.photos/seed/${member.id}/200/200`} 
                      alt={member.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="font-editorial font-bold text-2xl text-black group-hover:underline decoration-2 underline-offset-4">{member.name}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                      <span>District {member.district}</span>
                      <span className="w-1 h-1 bg-slate-300" />
                      <span>{member.party}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 mt-0.5 text-black" />
                    <span className="line-clamp-2 leading-relaxed">{member.neighborhoods.join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t-editorial">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bills</p>
                      <p className="font-editorial text-2xl font-black text-black leading-none">{member.sponsoredBillsCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Enacted</p>
                      <p className="font-editorial text-2xl font-black text-black leading-none">{member.enactedBillsCount}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-black transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-20 bg-white border-editorial flex flex-col items-center justify-center">
            <UsersRound className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No members found matching your search.</p>
            <button onClick={() => setSearch('')} className="mt-4 text-black underline text-sm font-medium hover:text-slate-600 active:scale-95 transition-all">
              Clear search
            </button>
          </div>
        )}
      </div>
    );
}
