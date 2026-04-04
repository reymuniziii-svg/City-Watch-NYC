import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, CalendarX } from 'lucide-react';
import { motion } from 'motion/react';
import { Hearing } from '../types';
import { fetchHearings } from '../services/nycDataService';
import HearingCard from './HearingCard';

export default function HearingList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(50);

  useEffect(() => {
    setDisplayCount(50);
  }, [search]);

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
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="h-12 w-80 bg-slate-200 animate-pulse mb-4"></div>
            <div className="h-4 w-96 bg-slate-200 animate-pulse"></div>
          </div>
          <div className="w-full md:w-80 h-12 bg-slate-200 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border-editorial p-6 md:p-8 animate-pulse">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 shrink-0">
                  <div className="h-6 w-24 bg-slate-200 mb-2"></div>
                  <div className="h-8 w-32 bg-slate-200 mb-4"></div>
                  <div className="h-4 w-20 bg-slate-200"></div>
                </div>
                <div className="flex-1">
                  <div className="h-8 w-3/4 bg-slate-200 mb-4"></div>
                  <div className="h-4 w-1/2 bg-slate-200 mb-6"></div>
                  <div className="flex gap-4">
                    <div className="h-6 w-24 bg-slate-200"></div>
                    <div className="h-6 w-24 bg-slate-200"></div>
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-editorial text-5xl font-black text-black tracking-tighter mb-4">Upcoming Hearings</h1>
          <p className="text-slate-600">Stay informed about committee meetings and public oversight.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
          <input
            type="text"
            placeholder="Search by committee or keyword..."
            className="w-full pl-12 pr-4 py-3 bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all rounded-none"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredHearings.slice(0, displayCount).map((hearing, i) => (
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

      {filteredHearings.length > displayCount && (
        <div className="text-center py-8">
          <button
            onClick={() => setDisplayCount(prev => prev + 50)}
            className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-slate-800 active:scale-95 transition-all"
          >
            Load More Hearings
          </button>
          <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Showing {displayCount} of {filteredHearings.length}
          </p>
        </div>
      )}

      {filteredHearings.length === 0 && (
        <div className="text-center py-20 bg-white border-editorial flex flex-col items-center justify-center">
          <CalendarX className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hearings found matching your search.</p>
          <button onClick={() => handleSearchChange('')} className="mt-4 text-black underline text-sm font-medium hover:text-slate-600 active:scale-95 transition-all">
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
