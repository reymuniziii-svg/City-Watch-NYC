import type { WorkHorseScore } from '../lib/types';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function WorkHorseScorecard({ score }: { score: WorkHorseScore }) {
  const metrics = [
    {
      label: 'Success Rate',
      value: formatPercent(score.successRate),
      detail: 'Bills that advanced past introduction',
    },
    {
      label: 'Committee Pull',
      value: formatPercent(score.committeePullRate),
      detail: 'Bills pulled through committee hearing',
    },
    {
      label: 'Bipartisan Reach',
      value: formatPercent(score.bipartisanReachRate),
      detail: 'Bills attracting cross-party co-sponsors',
    },
    {
      label: 'Velocity Score',
      value: String(Math.round(score.velocityScore)),
      detail: 'Speed of co-sponsor accumulation (0-100)',
    },
    {
      label: 'Composite Score',
      value: String(Math.round(score.compositeScore)),
      detail: null,
      rank: score.rank,
    },
  ];

  const breakdown = [
    { label: 'Introduced', value: score.billBreakdown.introduced },
    { label: 'Passed Committee', value: score.billBreakdown.passedCommittee },
    { label: 'Enacted', value: score.billBreakdown.enacted },
    { label: 'Bipartisan', value: score.billBreakdown.bipartisanBills },
  ];

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-editorial text-3xl font-bold text-black">Work Horse Index</h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">
            Legislative effectiveness scorecard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 border-editorial md:grid-cols-3 xl:grid-cols-5 bg-black">
        {metrics.map((item) => (
          <div
            key={item.label}
            className="bg-white p-6 border-r-editorial border-b-editorial last:border-r-0 xl:border-b-0 md:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r-editorial"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {item.label}
            </p>
            <p className="font-editorial mt-4 text-4xl font-bold text-black">{item.value}</p>
            {item.rank != null && (
              <span className="mt-2 inline-block bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                Rank #{item.rank}
              </span>
            )}
            {item.detail && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.detail}</p>
            )}
          </div>
        ))}
      </div>

      {/* Bill Breakdown */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-0 border-editorial bg-black gap-[1px]">
        {breakdown.map((item) => (
          <div key={item.label} className="bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {item.label}
            </p>
            <p className="font-editorial mt-2 text-2xl font-bold text-black">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
