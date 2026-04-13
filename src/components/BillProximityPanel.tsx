import { useState, useEffect } from 'react';
import { Loader2, DollarSign } from 'lucide-react';
import type { BillDonorProximityEntry } from '../lib/types';

/* ── constants ────────────────────────────────────────────── */

const INDUSTRY_BADGE_COLORS: Record<string, string> = {
  'Real Estate': 'bg-amber-100 text-amber-800',
  'Finance': 'bg-blue-100 text-blue-800',
  'Legal': 'bg-purple-100 text-purple-800',
  'Labor': 'bg-green-100 text-green-800',
  'Healthcare': 'bg-rose-100 text-rose-800',
  'Education': 'bg-teal-100 text-teal-800',
  'Nonprofit / Advocacy': 'bg-indigo-100 text-indigo-800',
  'Government / Public Sector': 'bg-slate-200 text-slate-700',
  'Small Business / Retail': 'bg-orange-100 text-orange-800',
  'Other / Mixed': 'bg-gray-100 text-gray-600',
};

function fmt$(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

/* ── main component ──────────────────────────────────────── */

interface Props {
  billId: string;
}

export default function BillProximityPanel({ billId }: Props) {
  const [entry, setEntry] = useState<BillDonorProximityEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchJson<BillDonorProximityEntry[]>('/data/bill-donor-proximity.json')
      .then((data) => {
        const match = data.find((d) => d.billId === billId);
        if (match) {
          setEntry(match);
        } else {
          setNotFound(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setIsLoading(false);
      });
  }, [billId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound || !entry) {
    return null;
  }

  return (
    <div className="border-editorial bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-slate-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Top Donors Across Sponsors
        </p>
      </div>

      <div className="space-y-3">
        {entry.topDonors.slice(0, 10).map((donor, i) => {
          const badgeClass = INDUSTRY_BADGE_COLORS[donor.industry] ?? 'bg-gray-100 text-gray-600';

          return (
            <div
              key={`${donor.name}-${i}`}
              className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-black truncate">{donor.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-none shrink-0 ${badgeClass}`}
                  >
                    {donor.industry}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Donated to:
                  </span>
                  {donor.memberSlugs.map((slug) => {
                    const sponsor = entry.sponsors.find((s) => s.slug === slug);
                    return (
                      <span
                        key={slug}
                        className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 font-medium"
                      >
                        {sponsor?.name ?? slug}
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className="font-editorial font-bold text-sm text-black shrink-0 tabular-nums">
                {fmt$(donor.totalAmount)}
              </span>
            </div>
          );
        })}
      </div>

      {entry.topDonors.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          No donor proximity data for this bill.
        </p>
      )}
    </div>
  );
}
