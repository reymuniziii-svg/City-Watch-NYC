import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchBillDonorProximityByIntro } from '../services/nycDataService';
import type { BillDonorProximity } from '../lib/types';
import IndustryBadge from './shared/IndustryBadge';

function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString('en-US');
}

export default function BillProximityPanel({ introNumber }: { introNumber: string }) {
  const [data, setData] = useState<BillDonorProximity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBillDonorProximityByIntro(introNumber).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [introNumber]);

  if (loading) {
    return (
      <section className="border-editorial bg-white p-6">
        <p className="text-sm text-slate-500">Loading donor proximity...</p>
      </section>
    );
  }

  if (!data || data.topDonors.length === 0) return null;

  const donors = data.topDonors.slice(0, 10);

  return (
    <section className="border-editorial bg-white p-6">
      <div className="mb-5">
        <h3 className="font-editorial text-2xl font-bold text-black">Donor Proximity</h3>
        <p className="mt-1 text-sm text-slate-500">
          Top donors across this bill's sponsors
        </p>
      </div>

      <div className="space-y-0">
        {donors.map((donor, i) => (
          <div
            key={`${donor.donorName}-${i}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-slate-100 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-black text-sm">{donor.donorName}</span>
                <IndustryBadge industry={donor.industry} />
              </div>
              <div className="flex items-center gap-1 flex-wrap mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-1">
                  Sponsors:
                </span>
                {donor.sponsorSlugs.map((slug, j) => (
                  <Link
                    key={slug}
                    to={`/members/${slug}`}
                    className="text-xs text-slate-600 hover:text-black hover:underline transition-colors"
                  >
                    {slug}
                    {j < donor.sponsorSlugs.length - 1 ? ',' : ''}
                  </Link>
                ))}
              </div>
            </div>
            <span className="font-editorial font-bold text-lg text-black shrink-0">
              {formatCurrency(donor.totalToSponsors)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
