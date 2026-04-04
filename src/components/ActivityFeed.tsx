import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, FileText } from 'lucide-react';
import { Bill } from '../types';

type FilterMode = 'all' | 'committee' | 'enacted';

function formatDate(value?: string) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function isEnactedBill(bill: Bill) {
  return /Enacted|Mayor/i.test(bill.status);
}

function sortBillsByDate(bills: Bill[]) {
  return [...bills].sort((left, right) => {
    const leftDate = new Date(left.lastActionDate || left.introducedDate || 0).getTime();
    const rightDate = new Date(right.lastActionDate || right.introducedDate || 0).getTime();
    return rightDate - leftDate;
  });
}

export default function ActivityFeed({ bills }: { bills: Bill[] }) {
  const [filter, setFilter] = useState<FilterMode>('all');

  const filteredBills = useMemo(() => {
    const sortedBills = sortBillsByDate(bills);

    if (filter === 'committee') {
      return sortedBills.filter(b => !isEnactedBill(b));
    }

    if (filter === 'enacted') {
      return sortedBills.filter(isEnactedBill);
    }

    return sortedBills;
  }, [bills, filter]);

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-editorial text-3xl font-bold text-black">Legislative Activity</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            A quick read on the bills this member is leading in the current session.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'committee', label: 'In Committee' },
            { id: 'enacted', label: 'Enacted' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id as FilterMode)}
              className={
                filter === option.id
                  ? 'border-editorial bg-black px-5 py-2 text-xs font-bold uppercase tracking-widest text-white'
                  : 'border-editorial bg-white px-5 py-2 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-slate-50'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredBills.length > 0 ? (
        <ul className="space-y-0 border-editorial bg-black gap-[1px] flex flex-col">
          {filteredBills.slice(0, 24).map((bill) => (
            <li key={bill.id} className="bg-white p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 border-editorial px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                      <FileText className="h-3 w-3" />
                      <span>{bill.number}</span>
                    </span>
                    <span className="bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {bill.statusBucket || bill.status}
                    </span>
                  </div>

                  <h3 className="font-editorial text-2xl font-bold leading-snug text-black">{bill.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-2">{bill.summary}</p>

                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>{bill.sponsorCount ?? 0} sponsors</span>
                    <span>{bill.committee || 'Committee unavailable'}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {formatDate(bill.lastActionDate || bill.introducedDate)}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/bills?q=${encodeURIComponent(bill.number || '')}`}
                  className="inline-flex items-center gap-2 border-editorial bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white shrink-0"
                >
                  View Bill
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-editorial bg-white px-6 py-12 text-center">
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
            {filter === 'enacted' ? 'No bills have been enacted yet in this session.' : 'No bills match this filter.'}
          </p>
        </div>
      )}

      {filteredBills.length > 24 ? (
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-500">Showing 24 of {filteredBills.length} bills for readability.</p>
      ) : null}
    </section>
  );
}
