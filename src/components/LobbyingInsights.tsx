import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchBillLobbying } from '../services/nycDataService';
import type { BillLobbyingProfile } from '../lib/types';
import IndustryBadge, { INDUSTRY_COLORS } from './shared/IndustryBadge';
import ProGate from './ProGate';

function fmt$(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function positionDot(position: 'for' | 'against' | 'unknown') {
  const color = position === 'for' ? 'bg-green-500' : position === 'against' ? 'bg-red-500' : 'bg-gray-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`} />;
}

export default function LobbyingInsights({ introNumber }: { introNumber: string }) {
  const [data, setData] = useState<BillLobbyingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const result = await fetchBillLobbying(introNumber);
        if (active) setData(result);
      } catch (error) {
        console.error('Error loading lobbying data:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [introNumber]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Loading lobbying data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-500 py-4">No lobbying activity found for this bill.</p>
    );
  }

  const sortedClients = [...data.topClients]
    .sort((a, b) => b.totalSpending - a.totalSpending)
    .slice(0, 8);

  const sortedFirms = [...data.topFirms]
    .sort((a, b) => b.totalSpending - a.totalSpending)
    .slice(0, 5);

  return (
    <ProGate feature="Lobbying Insights" flag="canViewLobbyingData">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h4 className="font-editorial text-xl font-bold text-black">Lobbying Insights</h4>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest rounded-sm">Beta</span>
        </div>

        {/* A. Top Organizations */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Top Organizations</p>
          <div className="space-y-2">
            {sortedClients.map((client, i) => (
              <motion.div
                key={client.clientName}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0"
              >
                <span className="text-sm font-semibold text-black truncate flex-1">{client.clientName}</span>
                <IndustryBadge industry={client.clientIndustry} />
                {positionDot(client.position)}
                <span className="text-sm font-editorial font-bold text-black tabular-nums shrink-0">{fmt$(client.totalSpending)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* B. Position Breakdown */}
        {data.industryBreakdown.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Industry Positions</p>
            <div className="space-y-3">
              {data.industryBreakdown.map((ind) => {
                const total = ind.positions.for + ind.positions.against + ind.positions.unknown;
                const forPct = total > 0 ? (ind.positions.for / total) * 100 : 0;
                const againstPct = total > 0 ? (ind.positions.against / total) * 100 : 0;
                const unknownPct = total > 0 ? (ind.positions.unknown / total) * 100 : 0;
                return (
                  <div key={ind.industry}>
                    <p className="text-xs font-medium text-slate-700 mb-1">{ind.industry}</p>
                    <div className="flex h-3 w-full overflow-hidden bg-slate-100">
                      {forPct > 0 && (
                        <div className="bg-green-500 h-full" style={{ width: `${forPct}%` }} />
                      )}
                      {againstPct > 0 && (
                        <div className="bg-red-500 h-full" style={{ width: `${againstPct}%` }} />
                      )}
                      {unknownPct > 0 && (
                        <div className="bg-gray-300 h-full" style={{ width: `${unknownPct}%` }} />
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />{ind.positions.for} for</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />{ind.positions.against} against</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />{ind.positions.unknown} unknown</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C. Lobbying Firms */}
        {sortedFirms.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Lobbying Firms</p>
            <div className="space-y-2">
              {sortedFirms.map((firm, i) => (
                <motion.div
                  key={firm.lobbyistName}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-sm font-semibold text-black truncate flex-1">{firm.lobbyistName}</span>
                  <span className="text-xs text-slate-500">{firm.clientCount} client{firm.clientCount !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-editorial font-bold text-black tabular-nums shrink-0">{fmt$(firm.totalSpending)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProGate>
  );
}
