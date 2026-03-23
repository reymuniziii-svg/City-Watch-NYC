import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Hearing } from '../types';
import { fetchHearings } from '../services/nycDataService';
import HearingCard from './HearingCard';

export default function HearingList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHearings().then(data => {
      setHearings(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  const filteredHearings = hearings.filter((hearing) => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      hearing.title,
      hearing.committee,
      hearing.location,
      hearing.date,
      hearing.time,
      hearing.bills.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }

    setSearchParams(nextParams, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading hearings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Upcoming Hearings</h1>
          <p className="text-slate-500">Stay informed about committee meetings and public oversight.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by committee or keyword..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredHearings.map((hearing, i) => (
          <motion.div
            key={hearing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <HearingCard hearing={hearing} />
          </motion.div>
        ))}
      </div>

      {filteredHearings.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
          <p className="text-slate-500">No hearings found matching your search.</p>
        </div>
      )}
    </div>
  );
}
