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
    <section className="border-editorial bg-white p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-editorial text-3xl font-bold text-black">Activity Scorecard</h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">A quick transparency snapshot, not a grade.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 border-editorial md:grid-cols-2 xl:grid-cols-4 bg-black">
        {items.map((item) => (
          <div key={item.label} className="bg-white p-6 border-r-editorial border-b-editorial last:border-r-0 xl:border-b-0 md:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r-editorial">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
            <p className="font-editorial mt-4 text-4xl font-bold text-black">{item.value}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
