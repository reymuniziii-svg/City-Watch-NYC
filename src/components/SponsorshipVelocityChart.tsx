import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { BillVelocityEntry } from '../lib/types';

const COLORS = ['#F27D26', '#14B8A6', '#8B5CF6', '#F43F5E', '#EAB308'];

interface Props {
  data: BillVelocityEntry[];
}

export default function SponsorshipVelocityChart({ data }: Props) {
  const { chartData, bills, committeeMean } = useMemo(() => {
    // Take 5 most recent bills (by first timeline entry date)
    const sorted = [...data]
      .filter((b) => b.coSponsorTimeline.length > 0)
      .sort((a, b) => {
        const aDate = a.coSponsorTimeline[0]?.date ?? '';
        const bDate = b.coSponsorTimeline[0]?.date ?? '';
        return bDate.localeCompare(aDate);
      })
      .slice(0, 5);

    // Compute days since introduction for each entry
    const billKeys = sorted.map((b) => b.introNumber);

    // Build unified timeline: each row is a "days since intro" value
    const daySet = new Set<number>();
    const billTimelines: Record<string, { day: number; count: number }[]> = {};

    for (const bill of sorted) {
      if (bill.coSponsorTimeline.length === 0) continue;
      const introDate = new Date(bill.coSponsorTimeline[0].date).getTime();
      billTimelines[bill.introNumber] = bill.coSponsorTimeline.map((point) => {
        const day = Math.round(
          (new Date(point.date).getTime() - introDate) / (1000 * 60 * 60 * 24)
        );
        daySet.add(day);
        return { day, count: point.count };
      });
    }

    const allDays = Array.from(daySet).sort((a, b) => a - b);

    const rows = allDays.map((day) => {
      const row: Record<string, number | null> = { day };
      for (const key of billKeys) {
        const timeline = billTimelines[key];
        if (!timeline) {
          row[key] = null;
          continue;
        }
        // Find the last entry at or before this day
        let val: number | null = null;
        for (const point of timeline) {
          if (point.day <= day) val = point.count;
        }
        row[key] = val;
      }
      return row;
    });

    // Average committeeMeanDays across bills that have it
    const meansWithValue = sorted
      .map((b) => b.committeeMeanDays)
      .filter((v): v is number => v != null);
    const avgMean =
      meansWithValue.length > 0
        ? Math.round(meansWithValue.reduce((a, b) => a + b, 0) / meansWithValue.length)
        : null;

    return { chartData: rows, bills: sorted, committeeMean: avgMean };
  }, [data]);

  if (bills.length === 0) {
    return (
      <section className="border-editorial bg-white p-8">
        <h2 className="font-editorial text-3xl font-bold text-black mb-2">
          Co-Sponsor Velocity
        </h2>
        <p className="text-sm text-slate-500">No velocity data available.</p>
      </section>
    );
  }

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-6">
        <h2 className="font-editorial text-3xl font-bold text-black">Co-Sponsor Velocity</h2>
        <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">
          Co-sponsor accumulation over time since introduction
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{
                value: 'Days since introduction',
                position: 'insideBottom',
                offset: -2,
                fontSize: 11,
                fill: '#94a3b8',
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{
                value: 'Co-sponsors',
                angle: -90,
                position: 'insideLeft',
                fontSize: 11,
                fill: '#94a3b8',
              }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: '1px solid black',
                borderRadius: 0,
                backgroundColor: 'white',
              }}
              labelFormatter={(val) => `Day ${val}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="plainline"
            />
            {committeeMean != null && (
              <ReferenceLine
                x={committeeMean}
                stroke="#94a3b8"
                strokeDasharray="6 4"
                label={{
                  value: `Committee mean (${committeeMean}d)`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#94a3b8',
                }}
              />
            )}
            {bills.map((bill, i) => (
              <Line
                key={bill.introNumber}
                type="monotone"
                dataKey={bill.introNumber}
                name={bill.introNumber}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend detail */}
      <div className="mt-4 space-y-1">
        {bills.map((bill, i) => (
          <div key={bill.introNumber} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="inline-block w-3 h-0.5"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="font-bold text-slate-700">{bill.introNumber}</span>
            <span className="truncate">{bill.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
