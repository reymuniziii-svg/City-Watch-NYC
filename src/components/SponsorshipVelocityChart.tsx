import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchBillVelocityForMember } from '../services/nycDataService';
import type { BillVelocityEntry } from '../lib/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ChartPoint {
  dayOffset: number;
  actual: number;
  mean: number | null;
  label: string;
}

function buildChartData(entry: BillVelocityEntry): ChartPoint[] {
  const introTime = new Date(entry.introDate).getTime();
  const msPerDay = 86400000;

  const points: ChartPoint[] = [];
  const daySet = new Set<number>();

  for (const pt of entry.sponsorTimeline) {
    const days = Math.round((new Date(pt.date).getTime() - introTime) / msPerDay);
    if (!daySet.has(days)) {
      daySet.add(days);
      points.push({ dayOffset: days, actual: pt.count, mean: null, label: `Day ${days}` });
    }
  }

  for (const pt of entry.committeeMean) {
    const days = Math.round((new Date(pt.date).getTime() - introTime) / msPerDay);
    const existing = points.find((p) => p.dayOffset === days);
    if (existing) {
      existing.mean = pt.count;
    } else {
      points.push({ dayOffset: days, actual: 0, mean: pt.count, label: `Day ${days}` });
    }
  }

  points.sort((a, b) => a.dayOffset - b.dayOffset);
  return points;
}

export default function SponsorshipVelocityChart({ memberSlug }: { memberSlug: string }) {
  const [entries, setEntries] = useState<BillVelocityEntry[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBillVelocityForMember(memberSlug).then((data) => {
      const filtered = data.filter((e) => e.sponsorTimeline.length > 1);
      setEntries(filtered);
      if (filtered.length > 0) setSelected(filtered[0].introNumber);
      setLoading(false);
    });
  }, [memberSlug]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.introNumber === selected) ?? null,
    [entries, selected],
  );

  const chartData = useMemo(
    () => (selectedEntry ? buildChartData(selectedEntry) : []),
    [selectedEntry],
  );

  if (loading) {
    return (
      <div className="border-editorial bg-white p-8">
        <p className="text-sm text-slate-500">Loading velocity data...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-editorial text-2xl font-bold text-black">
            Sponsorship Velocity
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Co-sponsor accumulation vs. committee historical mean
          </p>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border-editorial bg-white px-3 py-2 text-sm font-medium"
        >
          {entries.map((e) => (
            <option key={e.introNumber} value={e.introNumber}>
              {e.introNumber} — {e.title.slice(0, 50)}
              {e.title.length > 50 ? '...' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedEntry && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>
            Committee: <strong className="text-black">{selectedEntry.committee}</strong>
          </span>
          <span>
            Introduced:{' '}
            <strong className="text-black">{formatDate(selectedEntry.introDate)}</strong>
          </span>
          {selectedEntry.daysToCommittee !== null && (
            <span>
              Days to committee vote:{' '}
              <strong className="text-black">{selectedEntry.daysToCommittee}</strong>
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            label={{
              value: 'Co-Sponsors',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#64748b' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #000',
              borderRadius: 0,
              fontSize: 13,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual"
            name="This Bill"
            stroke="#000"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="mean"
            name="Committee Mean"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
