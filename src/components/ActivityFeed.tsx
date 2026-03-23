import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, FileText } from 'lucide-react';
import { Bill } from '../types';

type FilterMode = 'all' | 'recent' | 'enacted';

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

    if (filter === 'recent') {
      return sortedBills.slice(0, 8);
    }

    if (filter === 'enacted') {
      return sortedBills.filter(isEnactedBill);
    }

    return sortedBills;
  }, [bills, filter]);

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Legislative Activity</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            A quick read on the bills this member is leading in the current session.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'recent', label: 'Recent' },
            { id: 'enacted', label: 'Enacted' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id as FilterMode)}
              className={
                filter === option.id
                  ? 'rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredBills.length > 0 ? (
        <ul className="space-y-4">
          {filteredBills.slice(0, 24).map((bill) => (
            <li key={bill.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <FileText className="h-3 w-3" />
                      <span>{bill.number}</span>
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {bill.statusBucket || bill.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold leading-snug text-slate-900">{bill.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{bill.summary}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span>{bill.sponsorCount ?? 0} sponsors</span>
                    <span>{bill.committee || 'Committee unavailable'}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {formatDate(bill.lastActionDate || bill.introducedDate)}
                    </span>
                  </div>
                </div>

                <Link
                  to={bill.route || `/bills`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  View Bill
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <p className="text-slate-500">No bills match this activity filter yet.</p>
        </div>
      )}

      {filteredBills.length > 24 ? (
        <p className="mt-4 text-sm text-slate-500">Showing 24 of {filteredBills.length} bills for readability.</p>
      ) : null}
    </section>
  );
}
