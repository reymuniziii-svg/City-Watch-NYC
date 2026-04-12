import type { WorkHorseScore } from '../lib/types';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function scoreColor(score: number): string {
  if (score >= 60) return 'text-emerald-600';
  if (score >= 30) return 'text-amber-600';
  return 'text-slate-600';
}

export default function WorkHorseScorecard({ workHorse }: { workHorse: WorkHorseScore }) {
  const items = [
    {
      label: 'Work Horse Score',
      value: String(workHorse.compositeScore),
      detail: `Rank ${workHorse.rank} of 51`,
      highlight: true,
    },
    {
      label: 'Success Rate',
      value: formatPercent(workHorse.successRate),
      detail: `${workHorse.billBreakdown.enacted} enacted of ${workHorse.billBreakdown.introduced} introduced`,
    },
    {
      label: 'Committee Pull',
      value: formatPercent(workHorse.committeePullRate),
      detail: `${workHorse.billBreakdown.passedCommittee} bills moved through committee`,
    },
    {
      label: 'Bipartisan Reach',
      value: formatPercent(workHorse.bipartisanReachRate),
      detail: `${workHorse.billBreakdown.bipartisanBills} bills with cross-party co-sponsors`,
    },
    {
      label: 'Velocity',
      value: formatPercent(workHorse.velocityScore),
      detail: 'Co-sponsor acquisition speed vs. committee average',
    },
  ];

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-editorial text-3xl font-bold text-black">Work Horse Index</h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">
            Who moves policy vs. who performs for the camera.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 border-editorial md:grid-cols-2 xl:grid-cols-5 bg-black">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-white p-6 border-r-editorial border-b-editorial last:border-r-0 xl:border-b-0 md:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r-editorial"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {item.label}
            </p>
            <p
              className={`font-editorial mt-4 text-4xl font-bold ${
                item.highlight ? scoreColor(workHorse.compositeScore) : 'text-black'
              }`}
            >
              {item.value}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
