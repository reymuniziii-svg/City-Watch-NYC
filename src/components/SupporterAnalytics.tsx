import { useState, useEffect } from 'react';
import {
  BarChart3,
  Loader2,
  Mail,
  Phone,
  Eye,
  MapPin,
  Users,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useSession } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { getKitAnalytics } from '../services/actionKitService';
import type { ActionKitAnalytics } from '../services/actionKitService';

interface SupporterAnalyticsProps {
  kitId: string;
}

function formatSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function SupporterAnalytics({ kitId }: SupporterAnalyticsProps) {
  const { session } = useSession();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<ActionKitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !kitId) {
      setLoading(false);
      return;
    }

    session
      .getToken()
      .then(async (token) => {
        if (!token) throw new Error('Not authenticated');
        return getKitAnalytics(token, kitId);
      })
      .then(setAnalytics)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [session, kitId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
        <p className="text-slate-500 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-2xl font-bold text-black mb-2">
          Error Loading Analytics
        </h2>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-2xl font-bold text-black mb-2">No Data</h2>
        <p className="text-sm text-slate-600">No analytics data available for this kit.</p>
      </div>
    );
  }

  const uniqueDistricts = analytics.byDistrict.length;

  // Format dates for chart display (MM/DD)
  const chartDateData = analytics.byDate.map((d) => ({
    ...d,
    label: `${d.date.slice(5, 7)}/${d.date.slice(8, 10)}`,
  }));

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/action-kits')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-black transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Action Kits
        </button>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Supporter Analytics
          </span>
        </div>
        <h1 className="font-editorial text-4xl md:text-5xl font-black text-black tracking-tighter leading-none">
          Kit Engagement
        </h1>
      </motion.div>

      {/* Summary Stats Strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-0 border-editorial bg-black gap-[1px]"
      >
        {[
          {
            label: 'Total Actions',
            value: analytics.totalActions.toLocaleString(),
            icon: TrendingUp,
          },
          {
            label: 'Emails Sent',
            value: analytics.byType.email_sent.toLocaleString(),
            icon: Mail,
          },
          {
            label: 'Calls Made',
            value: analytics.byType.call_made.toLocaleString(),
            icon: Phone,
          },
          {
            label: 'Unique Districts',
            value: uniqueDistricts.toLocaleString(),
            icon: MapPin,
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
            <p className="font-editorial text-3xl font-bold text-black">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Page Views Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex items-center gap-3 bg-slate-50 border-editorial p-4"
      >
        <Eye className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-sm text-slate-600">
          <span className="font-bold text-black">{analytics.byType.page_view.toLocaleString()}</span>{' '}
          page views recorded in the last 30 days.
        </p>
      </motion.div>

      {/* Line Chart: Actions Over Time */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border-editorial p-6"
      >
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
          Actions Over Time (Last 30 Days)
        </p>
        {analytics.totalActions === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            No activity data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartDateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 0,
                  fontSize: 12,
                  boxShadow: 'none',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#000' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#000"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#000' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Bar Chart: Top Districts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white border-editorial p-6"
      >
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
          Top Districts by Engagement
        </p>
        {analytics.byDistrict.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            No district data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.byDistrict}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                label={{
                  value: 'District',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 10, fill: '#94a3b8', textTransform: 'uppercase' },
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 0,
                  fontSize: 12,
                  boxShadow: 'none',
                }}
                labelFormatter={(val) => `District ${val}`}
              />
              <Bar dataKey="count" fill="#000" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Table: Top Targeted Members */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border-editorial"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <Users className="w-4 h-4 text-slate-400" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Top Targeted Members
          </p>
        </div>
        {analytics.topMembers.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            No member targeting data yet
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Member
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.topMembers.map((member, i) => (
                <tr
                  key={member.memberSlug}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-black">
                      {formatSlug(member.memberSlug)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">{member.memberSlug}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-editorial font-bold text-black">
                      {member.count.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Methodology Note */}
      <div className="p-6 bg-slate-50 border-editorial text-sm text-slate-600 max-w-2xl">
        <p className="font-bold text-black uppercase tracking-widest text-xs mb-2">
          About This Data
        </p>
        <p>
          Analytics reflect actions taken through your action kit embed page over the last 30
          days. Page views are recorded automatically. Email and call actions are tracked when
          supporters use the contact form. District data is derived from supporter-provided ZIP
          codes.
        </p>
      </div>
    </div>
  );
}
