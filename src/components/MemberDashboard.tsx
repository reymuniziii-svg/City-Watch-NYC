import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, Globe, Twitter, FileText, Landmark, Calendar, BarChart3, Loader2, Share2, Check, Network, AlertTriangle, Eye, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bill, Hearing, CampaignFinance, MemberMetrics } from '../types';
import { fetchMemberProfile, fetchInfluenceMap, fetchConflictAlerts, fetchMemberLobbying } from '../services/nycDataService';
import type { MemberProfile, BillRecord, HearingRecord, InfluenceMapEntry, ConflictAlert, MemberLobbyingProfile } from '../lib/types';
import BillCard from './BillCard';
import HearingCard from './HearingCard';
import FinanceView from './FinanceView';
import Scorecard from './Scorecard';
import ActivityFeed from './ActivityFeed';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import WatchButton from './WatchButton';
import IndustryBadge, { INDUSTRY_COLORS } from './shared/IndustryBadge';
import ProGate from './ProGate';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function mapBillRecordToBill(bill: BillRecord): Bill {
  return {
    id: bill.billId,
    number: bill.introNumber,
    title: bill.title,
    summary: bill.summary,
    status: bill.statusName,
    sponsors: bill.sponsors ? bill.sponsors.map(s => s.fullName) : [],
    introducedDate: bill.introDate,
    lastActionDate: bill.actionDate,
    introNumber: bill.introNumber,
    session: bill.session,
    statusBucket: bill.statusBucket,
    committee: bill.committee,
    sponsorCount: bill.sponsorCount,
    leadSponsorSlug: bill.leadSponsorSlug,
  };
}

function mapHearingRecordToHearing(hearing: HearingRecord): Hearing {
  const dateObj = new Date(hearing.date);
  const now = new Date();
  return {
    id: hearing.eventId.toString(),
    title: hearing.bodyName,
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toTimeString().substring(0, 5),
    location: hearing.location,
    committee: hearing.bodyName,
    bills: hearing.agendaItems ? hearing.agendaItems.map(item => item.title) : [],
    isPast: dateObj < now,
    legistarUrl: hearing.legistarUrl ?? undefined,
  };
}

function fmt$(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function MemberDashboard() {
  const { id, district } = useParams();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [finance, setFinance] = useState<CampaignFinance | null>(null);
  const [metrics, setMetrics] = useState<MemberMetrics | null>(null);
  const [influenceData, setInfluenceData] = useState<InfluenceMapEntry[]>([]);
  const [memberAlerts, setMemberAlerts] = useState<ConflictAlert[]>([]);
  const [lobbyingData, setLobbyingData] = useState<MemberLobbyingProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'bills' | 'money' | 'hearings'>('activity');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        let memberId = id;
        if (!memberId && district) {
          // If we only have district, we need to find the slug.
          // For now, we assume id is provided. If not, we could fetch members-index.json to find the slug.
          const res = await fetch('/data/members-index.json');
          if (res.ok) {
            const index = await res.json();
            const found = index.find((m: any) => m.districtNumber === parseInt(district));
            if (found) memberId = found.slug;
          }
        }

        if (memberId) {
          const profile = await fetchMemberProfile(memberId);
          if (profile) {
            setMember(profile);
            setBills(profile.bills.map(mapBillRecordToBill));
            setHearings(profile.upcomingHearings.map(mapHearingRecordToHearing));
            setFinance(profile.finance as CampaignFinance | null);
            setMetrics({
              slug: profile.slug,
              billsSponsored: profile.scorecard.billsSponsored,
              billsEnacted: profile.scorecard.billsEnacted,
              coSponsorshipRate: profile.scorecard.coSponsorshipRate,
              hearingActivity: profile.scorecard.hearingActivity,
              rankSponsored: profile.scorecard.billsSponsoredRank,
              rankEnacted: profile.scorecard.billsEnactedRank,
            });
          }

          const [allInfluence, allAlerts, lobbyingProfile] = await Promise.all([
            fetchInfluenceMap(),
            fetchConflictAlerts(),
            fetchMemberLobbying(memberId!),
          ]);
          setInfluenceData(allInfluence.filter(e => e.memberSlug === memberId).slice(0, 5));
          setMemberAlerts(allAlerts.filter(a => a.memberSlug === memberId).slice(0, 3));
          setLobbyingData(lobbyingProfile);
        }
      } catch (error) {
        console.error('Error loading member data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, district]);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 text-black animate-spin" />
          <p className="text-slate-500 font-medium">Loading civic profile...</p>
        </div>
      );
    }

    if (!member) {
      return (
        <div className="text-center py-20 border-editorial bg-white">
          <h2 className="font-editorial text-3xl font-bold text-black mb-4">Member Not Found</h2>
          <p className="text-slate-600 mb-8">We couldn't find the council member you're looking for.</p>
          <Link to="/" className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors">
            Go Back Home
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-12">
        {/* Profile Header */}
        <div className="bg-white border-editorial p-8 md:p-12 relative">
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
            <div className="relative">
              <div className="w-32 h-32 md:w-48 md:h-48 overflow-hidden border-editorial">
                <img 
                  src={member.photoUrl || `https://picsum.photos/seed/${member.slug}/400/400`} 
                  alt={member.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-black text-white w-16 h-16 flex flex-col items-center justify-center border-editorial">
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Dist</span>
                <span className="font-editorial text-2xl font-black leading-none">{member.districtNumber}</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                <span className="px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest">
                  {member.party}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest">
                  NYC
                </span>
              </div>
              <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter mb-6 leading-none">
                {member.fullName}
              </h1>
              <p className="text-lg text-slate-600 mb-10 max-w-2xl leading-relaxed">
                Representing <span className="font-semibold text-black">{member.neighborhoods?.join(', ')}</span>.
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-8">
                {member.contact?.email && (
                  <a href={`mailto:${member.contact.email}`} title="Email Member" className="flex items-center gap-2 text-slate-600 hover:text-black active:scale-95 transition-all font-medium">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wider">Email</span>
                  </a>
                )}
                {member.contact?.phone && (
                  <a href={`tel:${member.contact.phone}`} title="Call Member" className="flex items-center gap-2 text-slate-600 hover:text-black active:scale-95 transition-all font-medium">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wider">{member.contact.phone}</span>
                  </a>
                )}
                {member.contact?.website && (
                  <a href={member.contact.website} target="_blank" rel="noopener noreferrer" title="Visit Website" className="flex items-center gap-2 text-slate-600 hover:text-black active:scale-95 transition-all font-medium">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wider">Website</span>
                  </a>
                )}
                {member.socials?.x && (
                  <a href={`https://twitter.com/${member.socials.x}`} target="_blank" rel="noopener noreferrer" title="Twitter Profile" className="flex items-center gap-2 text-slate-600 hover:text-black active:scale-95 transition-all font-medium">
                    <Twitter className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wider">@{member.socials.x}</span>
                  </a>
                )}
                <WatchButton itemType="member" itemValue={member.slug} itemLabel={member.fullName} />
                <button onClick={handleShare} title="Share Profile" className="flex items-center gap-2 text-slate-600 hover:text-black active:scale-95 transition-all font-medium">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                  <span className="text-sm uppercase tracking-wider">{copied ? 'Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b-editorial w-full overflow-x-auto sticky top-[57px] md:top-0 bg-white z-40 shadow-sm">
          {[
            { id: 'activity', label: 'Activity', icon: BarChart3 },
            { id: 'bills', label: 'Bills', icon: FileText },
            { id: 'hearings', label: 'Hearings', icon: Calendar },
            { id: 'money', label: 'Money', icon: Landmark },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 md:px-8 md:py-4 text-sm font-bold uppercase tracking-widest transition-all duration-200 border-b-2",
                activeTab === tab.id 
                  ? "border-black text-black" 
                  : "border-transparent text-slate-500 hover:text-black"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {metrics ? (
                <Scorecard metrics={metrics} />
              ) : (
                <div className="border-editorial bg-white p-12 text-center">
                  <p className="font-bold uppercase tracking-widest text-xs text-black">Scorecard data unavailable</p>
                  <p className="mt-2 text-slate-500">
                    Static activity metrics are not available for this member yet.
                  </p>
                </div>
              )}
              <ActivityFeed bills={bills} />
            </motion.div>
          )}

          {activeTab === 'bills' && (
            <motion.div
              key="bills"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-4 flex items-center justify-between border-b-editorial pb-4">
                <h2 className="font-editorial text-3xl font-bold text-black">Sponsored Bills</h2>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">{bills.length} Active Bills</span>
              </div>
              {bills.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {bills.map((bill) => <BillCard key={bill.id} bill={bill} />)}
                </div>
              ) : (
                <div className="border-editorial bg-white p-12 text-center">
                  <p className="text-slate-500">No active bill sponsorships found for this session.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'hearings' && (
            <motion.div
              key="hearings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 border-b-editorial pb-4">
                <h2 className="font-editorial text-3xl font-bold text-black">Upcoming Hearings</h2>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">{hearings.length} Scheduled</span>
              </div>
              {hearings.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {hearings.map(hearing => <HearingCard key={hearing.id} hearing={hearing} />)}
                </div>
              ) : (
                <div className="p-12 bg-white border-editorial text-center">
                  <p className="text-slate-500">No upcoming hearings found for this member's committees.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'money' && (
            <motion.div
              key="money"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <FinanceView data={finance} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Influence Connections */}
      {influenceData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between border-b-editorial pb-4">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-black" />
              <h2 className="font-editorial text-3xl font-bold text-black">Influence Connections</h2>
            </div>
            <Link
              to={`/influence?member=${member.slug}`}
              className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
            >
              View Full Map &rarr;
            </Link>
          </div>

          {/* Top donor-to-bill connections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {influenceData.map((entry, i) => (
              <motion.div
                key={`${entry.donorName}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border-editorial p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-black truncate">{entry.donorName}</p>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    INDUSTRY_COLORS[entry.donorIndustry] ?? 'bg-gray-100 text-gray-600'
                  }`}>
                    {entry.donorIndustry}
                  </span>
                </div>
                <p className="font-editorial text-2xl font-bold text-black">
                  {fmt$(entry.totalAmount)}
                </p>
                <div className="space-y-1">
                  {entry.relatedBills.slice(0, 2).map((bill) => (
                    <p key={bill.introNumber} className="text-xs text-slate-500 truncate">
                      {bill.introNumber} — {bill.title}
                    </p>
                  ))}
                  {entry.relatedBills.length > 2 && (
                    <p className="text-xs text-slate-400">
                      +{entry.relatedBills.length - 2} more bills
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Conflict alerts for this member */}
          {memberAlerts.length > 0 && (
            <div className="p-6 bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
                  Potential Conflicts Detected
                </p>
              </div>
              {memberAlerts.map((alert, i) => (
                <div key={`alert-${i}`} className="flex items-start gap-3 text-sm">
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    Math.abs(alert.daysDelta) < 7 ? 'bg-red-100 text-red-800' :
                    Math.abs(alert.daysDelta) < 14 ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {Math.abs(alert.daysDelta)}d
                  </span>
                  <p className="text-slate-700">
                    <strong>{alert.donorName}</strong> ({alert.donorIndustry}) donated {fmt$(alert.donationAmount)} near {alert.billIntroNumber}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Lobbying Activity */}
          {lobbyingData && (
            <ProGate feature="Lobbying Activity" flag="canViewLobbyingData">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-black" />
                  <h3 className="font-editorial text-2xl font-bold text-black">Lobbying Activity</h3>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest rounded-sm">Beta</span>
                </div>

                {/* Top clients grid */}
                {lobbyingData.topClients.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Top Lobbying Clients</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lobbyingData.topClients.map((client, i) => (
                        <motion.div
                          key={`${client.clientName}-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white border-editorial p-5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-black truncate">{client.clientName}</p>
                            <IndustryBadge industry={client.clientIndustry} />
                          </div>
                          <p className="font-editorial text-2xl font-bold text-black">
                            {fmt$(client.totalSpending)}
                          </p>
                          <div className="space-y-1">
                            {client.relatedBills.slice(0, 2).map((bill) => (
                              <p key={bill.introNumber} className="text-xs text-slate-500 truncate">
                                {bill.introNumber} — {bill.title}
                              </p>
                            ))}
                            {client.relatedBills.length > 2 && (
                              <p className="text-xs text-slate-400">
                                +{client.relatedBills.length - 2} more bills
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Industry breakdown bars */}
                {lobbyingData.topIndustries.length > 0 && (
                  <div className="bg-white border-editorial p-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Industry Breakdown (Lobbying Spending)</p>
                    <div className="space-y-2">
                      {lobbyingData.topIndustries.map(({ industry, totalSpending }) => {
                        const max = lobbyingData.topIndustries[0]?.totalSpending || 1;
                        const pct = totalSpending / max;
                        return (
                          <div key={industry} className="flex items-center gap-3">
                            <span className="w-40 text-xs font-medium text-slate-700 truncate shrink-0">{industry}</span>
                            <div className="flex-1 h-4 bg-slate-100 overflow-hidden">
                              <motion.div
                                className={`h-full ${INDUSTRY_COLORS[industry]?.split(' ')[0] ?? 'bg-gray-200'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(pct * 100, 1)}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600 tabular-nums w-24 text-right shrink-0">{fmt$(totalSpending)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent filings */}
                {lobbyingData.recentFilings.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Recent Filings</p>
                    <div className="space-y-2">
                      {lobbyingData.recentFilings.slice(0, 5).map((filing, i) => (
                        <div key={`filing-${i}`} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-black truncate">{filing.lobbyistName}</p>
                            <p className="text-xs text-slate-500 truncate">{filing.clientName} &middot; {filing.period} {filing.reportYear}</p>
                          </div>
                          <span className="text-sm font-editorial font-bold text-black tabular-nums shrink-0 ml-4">{fmt$(filing.compensationTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ProGate>
          )}
        </motion.div>
      )}
    </div>
  );
}
