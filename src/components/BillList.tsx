import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, SearchX, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Bill } from '../types';
import { fetchBills } from '../services/nycDataService';
import { expandSearchQuery } from '../services/geminiService';
import BillCard from './BillCard';

export default function BillList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'sponsors'>('newest');
  const [displayCount, setDisplayCount] = useState(50);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [semanticKeywords, setSemanticKeywords] = useState<string[]>([]);

  useEffect(() => {
    setDisplayCount(50);
  }, [search, sortBy]);

  useEffect(() => {
    fetchBills().then(data => {
      setBills(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSemanticKeywords([]); // Clear semantic search when user types

    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleSemanticSearch = async () => {
    if (!search.trim()) return;
    setIsSemanticSearching(true);
    try {
      const keywords = await expandSearchQuery(search);
      setSemanticKeywords(keywords);
    } catch (error) {
      console.error('Semantic search failed', error);
    } finally {
      setIsSemanticSearching(false);
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (semanticKeywords.length > 0) {
      const haystack = `${bill.title} ${bill.summary}`.toLowerCase();
      return semanticKeywords.some(kw => haystack.includes(kw.toLowerCase()));
    }

    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      bill.title,
      bill.number,
      bill.introNumber,
      bill.summary,
      bill.status,
      bill.committee,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="h-12 w-64 bg-slate-200 animate-pulse mb-4"></div>
            <div className="h-4 w-96 bg-slate-200 animate-pulse"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="h-12 w-40 bg-slate-200 animate-pulse"></div>
            <div className="h-12 w-full sm:w-80 bg-slate-200 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border-editorial p-6 md:p-8 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-6 w-24 bg-slate-200"></div>
                <div className="h-6 w-32 bg-slate-200"></div>
              </div>
              <div className="h-8 w-3/4 bg-slate-200 mb-4"></div>
              <div className="h-4 w-full bg-slate-200 mb-2"></div>
              <div className="h-4 w-5/6 bg-slate-200 mb-6"></div>
              <div className="flex gap-4">
                <div className="h-8 w-24 bg-slate-200"></div>
                <div className="h-8 w-24 bg-slate-200"></div>
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
          <h1 className="font-editorial text-5xl font-black text-black tracking-tighter mb-4">Legislative Bills</h1>
          <p className="text-slate-600">Track and demystify legislation moving through City Hall.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all rounded-none text-sm font-bold uppercase tracking-widest cursor-pointer outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="sponsors">Most Sponsors</option>
          </select>
          <div className="relative group w-full sm:w-96 flex">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
              <input
                type="text"
                placeholder="Search bills..."
                className="w-full pl-12 pr-4 py-3 bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all rounded-none"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSemanticSearch();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSemanticSearch}
              disabled={isSemanticSearching || !search.trim()}
              className="px-4 bg-black text-white hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
              title="Use AI to find related bills"
            >
              {isSemanticSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">AI Search</span>
            </button>
          </div>
        </div>
      </div>

      {semanticKeywords.length > 0 && (
        <div className="bg-slate-50 border-editorial p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-black uppercase tracking-widest mb-1">AI Search Active</p>
            <p className="text-sm text-slate-600">
              Found bills related to: <span className="font-medium text-black">{semanticKeywords.slice(0, 5).join(', ')}</span>
              {semanticKeywords.length > 5 && '...'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {[...filteredBills].sort((a, b) => {
          if (sortBy === 'newest') {
            return new Date(b.lastActionDate || b.introducedDate || 0).getTime() - new Date(a.lastActionDate || a.introducedDate || 0).getTime();
          }
          if (sortBy === 'oldest') {
            return new Date(a.lastActionDate || a.introducedDate || 0).getTime() - new Date(b.lastActionDate || b.introducedDate || 0).getTime();
          }
          if (sortBy === 'sponsors') {
            return (b.sponsorCount || 0) - (a.sponsorCount || 0);
          }
          return 0;
        }).slice(0, displayCount).map((bill, i) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <BillCard bill={bill} />
          </motion.div>
        ))}
      </div>

      {filteredBills.length > displayCount && (
        <div className="text-center py-8">
          <button
            onClick={() => setDisplayCount(prev => prev + 50)}
            className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-slate-800 active:scale-95 transition-all"
          >
            Load More Bills
          </button>
          <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Showing {displayCount} of {filteredBills.length}
          </p>
        </div>
      )}

      {filteredBills.length === 0 && (
        <div className="text-center py-20 bg-white border-editorial flex flex-col items-center justify-center">
          <SearchX className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No bills found matching your search.</p>
          <button onClick={() => handleSearchChange('')} className="mt-4 text-black underline text-sm font-medium hover:text-slate-600 active:scale-95 transition-all">
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
