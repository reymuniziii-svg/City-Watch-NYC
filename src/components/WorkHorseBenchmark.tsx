import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import ProGate from './ProGate';
import WorkHorseScorecard from './WorkHorseScorecard';
import type { WorkHorseScore } from '../lib/types';

interface MemberIndexEntry {
  slug: string;
  fullName: string;
  districtNumber: number;
  status: string;
}

interface WorkHorseIndexEntry {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  successRate: number;
  committeePullRate: number;
  bipartisanReachRate: number;
  velocityScore: number;
  compositeScore: number;
  rank: number;
  billBreakdown: {
    introduced: number;
    passedCommittee: number;
    enacted: number;
    bipartisanBills: number;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

export default function WorkHorseBenchmark() {
  const [members, setMembers] = useState<MemberIndexEntry[]>([]);
  const [workhorseData, setWorkhorseData] = useState<WorkHorseIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slugA, setSlugA] = useState('');
  const [slugB, setSlugB] = useState('');

  useEffect(() => {
    Promise.all([
      fetchJson<MemberIndexEntry[]>('/data/members-index.json'),
      fetchJson<WorkHorseIndexEntry[]>('/data/workhorse-index.json'),
    ]).then(([membersData, whData]) => {
      const seated = membersData.filter((m) => m.status === 'seated').sort((a, b) => a.fullName.localeCompare(b.fullName));
      setMembers(seated);
      setWorkhorseData(whData);
      if (seated.length >= 2) {
        setSlugA(seated[0].slug);
        setSlugB(seated[1].slug);
      }
      setIsLoading(false);
    });
  }, []);

  const whMap = useMemo(() => {
    const map = new Map<string, WorkHorseIndexEntry>();
    for (const entry of workhorseData) {
      map.set(entry.slug, entry);
    }
    return map;
  }, [workhorseData]);

  function toScore(entry: WorkHorseIndexEntry | undefined): WorkHorseScore | null {
    if (!entry) return null;
    return {
      successRate: entry.successRate,
      committeePullRate: entry.committeePullRate,
      bipartisanReachRate: entry.bipartisanReachRate,
      velocityScore: entry.velocityScore,
      compositeScore: entry.compositeScore,
      rank: entry.rank,
      billBreakdown: entry.billBreakdown,
    };
  }

  const scoreA = toScore(whMap.get(slugA));
  const scoreB = toScore(whMap.get(slugB));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <ProGate feature="Member Benchmark" flag="canBenchmarkMembers">
      <section className="space-y-8">
        <div>
          <h2 className="font-editorial text-3xl font-bold text-black">Work Horse Benchmark</h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">
            Compare two council members side by side
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Member A
            </label>
            <select
              value={slugA}
              onChange={(e) => setSlugA(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 bg-white text-black hover:border-black transition-colors cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.fullName} (District {m.districtNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end pb-2">
            <span className="font-editorial text-2xl font-bold text-slate-300">vs.</span>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Member B
            </label>
            <select
              value={slugB}
              onChange={(e) => setSlugB(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 bg-white text-black hover:border-black transition-colors cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.fullName} (District {m.districtNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side scorecards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {scoreA ? (
              <WorkHorseScorecard score={scoreA} />
            ) : (
              <div className="border-editorial bg-white p-8 text-center text-slate-500 text-sm">
                No Work Horse data for this member.
              </div>
            )}
          </div>
          <div>
            {scoreB ? (
              <WorkHorseScorecard score={scoreB} />
            ) : (
              <div className="border-editorial bg-white p-8 text-center text-slate-500 text-sm">
                No Work Horse data for this member.
              </div>
            )}
          </div>
        </div>
      </section>
    </ProGate>
  );
}
