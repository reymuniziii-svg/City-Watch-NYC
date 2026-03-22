import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Users, Landmark } from 'lucide-react';
import { CampaignFinance } from '../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function FinanceView({ data }: { data: CampaignFinance }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Raised', value: `$${data.totalRaised.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Public Funds', value: `$${data.publicFunds.toLocaleString()}`, icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Small-Dollar Share', value: `${data.smallDollarShare}%`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Avg. Contribution', value: `$${Math.round(data.totalRaised / 1200).toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className={stat.bg + " w-12 h-12 rounded-xl flex items-center justify-center mb-4"}>
              <stat.icon className={stat.color + " w-6 h-6"} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Donor Patterns</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.donorPatterns}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="amount"
                  nameKey="category"
                >
                  {data.donorPatterns.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Top Donors</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topDonors} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-8 bg-slate-900 text-white rounded-3xl shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4">Understanding the Data</h3>
          <p className="text-slate-300 leading-relaxed max-w-2xl">
            NYC's campaign finance system is designed to amplify the voices of everyday New Yorkers. 
            The <strong>Public Funds</strong> shown above represent matching funds provided by the city to candidates who 
            demonstrate broad grassroots support through small-dollar donations.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10">
              Grassroots Support: {data.smallDollarShare}%
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10">
              Public Match: 8-to-1 for small donations
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-3xl -mr-32 -mt-32 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-3xl -ml-32 -mb-32 rounded-full" />
      </div>
    </div>
  );
}
