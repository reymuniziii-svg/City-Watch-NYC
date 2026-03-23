import { MemberMetrics } from '../types';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function Scorecard({ metrics }: { metrics: MemberMetrics }) {
  const items = [
    {
      label: 'Bills Sponsored',
      value: String(metrics.billsSponsored),
      detail: `Rank ${metrics.rankSponsored} of 51`,
    },
    {
      label: 'Bills Enacted',
      value: String(metrics.billsEnacted),
      detail: `Rank ${metrics.rankEnacted} of 51`,
    },
    {
      label: 'Co-Sponsorship Rate',
      value: formatPercent(metrics.coSponsorshipRate),
      detail: "Share of appearances where they joined another member's bill",
    },
    {
      label: 'Chair Hearing Activity',
      value: String(metrics.hearingActivity),
      detail: 'Hearings held by committees they chair',
    },
  ];

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Scorecard</h2>
          <p className="mt-2 text-sm text-slate-500">A quick transparency snapshot, not a grade.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{item.value}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
