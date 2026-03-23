import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Bill } from '../types';
import { fetchBills } from '../services/nycDataService';
import BillCard from './BillCard';

export default function BillList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBills().then(data => {
      setBills(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  const filteredBills = bills.filter((bill) => {
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
        <p className="text-slate-500 font-medium">Loading bills...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Legislative Bills</h1>
          <p className="text-slate-500">Track and demystify legislation moving through City Hall.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by bill # or keyword..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredBills.map((bill, i) => (
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

      {filteredBills.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
          <p className="text-slate-500">No bills found matching your search.</p>
        </div>
      )}
    </div>
  );
}
