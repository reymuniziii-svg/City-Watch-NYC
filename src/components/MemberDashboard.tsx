import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, Globe, Twitter, Facebook, MapPin, FileText, Landmark, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CouncilMember, Bill, Hearing, CampaignFinance } from '../types';
import { fetchMembers, fetchBills, fetchHearings } from '../services/nycDataService';
import BillCard from './BillCard';
import HearingCard from './HearingCard';
import FinanceView from './FinanceView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MemberDashboard() {
  const { id, district } = useParams();
  const [member, setMember] = useState<CouncilMember | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [finance, setFinance] = useState<CampaignFinance | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'money' | 'hearings'>('activity');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const members = await fetchMembers();
        let foundMember: CouncilMember | undefined;
        
        if (id) {
          foundMember = members.find(m => m.id === id);
        } else if (district) {
          foundMember = members.find(m => m.district === parseInt(district));
        }

        if (foundMember) {
          setMember(foundMember);
          const [allBills, allHearings] = await Promise.all([fetchBills(), fetchHearings()]);
          
          // Filter bills sponsored by this member
          setBills(allBills.filter(b => b.sponsors?.includes(foundMember!.name)));
          
          // Filter hearings related to this member's committees
          setHearings(allHearings.filter(h => foundMember!.committees?.includes(h.committee)));

          // Mock campaign finance data
          setFinance({
            totalRaised: 245000 + (foundMember.district * 1000),
            publicFunds: 180000,
            smallDollarShare: 65,
            topDonors: [
              { name: 'NYC Hotel Trades Council', amount: 15000 },
              { name: '32BJ SEIU', amount: 12000 },
              { name: 'UFT PAC', amount: 10000 },
              { name: 'Real Estate Board of NY', amount: 8000 },
              { name: 'Individual Donors', amount: 120000 }
            ],
            donorPatterns: [
              { category: 'Labor Unions', amount: 45000 },
              { category: 'Real Estate', amount: 25000 },
              { category: 'Education', amount: 15000 },
              { category: 'Healthcare', amount: 20000 },
              { category: 'Individual Small Donors', amount: 140000 }
            ]
          });
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
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading civic profile...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Member Not Found</h2>
        <p className="text-slate-600 mb-8">We couldn't find the council member you're looking for.</p>
        <Link to="/" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Profile Header */}
      <div className="bg-white border border-slate-100 rounded-[40px] p-8 md:p-12 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
          <div className="relative">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-[32px] overflow-hidden border-4 border-slate-50 shadow-xl">
              <img 
                src={member.photoUrl || `https://picsum.photos/seed/${member.id}/400/400`} 
                alt={member.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-emerald-600 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg border-4 border-white">
              <span className="text-xs font-bold uppercase tracking-tighter leading-none">Dist</span>
              <span className="text-2xl font-black leading-none">{member.district}</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                {member.party}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                {member.borough}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              {member.name}
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-2xl leading-relaxed">
              Representing <span className="font-semibold text-slate-700">{member.neighborhoods.join(', ')}</span>.
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <a href={`mailto:${member.contact.email}`} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors font-medium">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </a>
              <a href={`tel:${member.contact.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors font-medium">
                <Phone className="w-4 h-4" />
                <span>{member.contact.phone}</span>
              </a>
              <a href={member.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors font-medium">
                <Globe className="w-4 h-4" />
                <span>Website</span>
              </a>
              {member.contact.twitter && (
                <a href={`https://twitter.com/${member.contact.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors font-medium">
                  <Twitter className="w-4 h-4" />
                  <span>@{member.contact.twitter}</span>
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-3xl -mr-48 -mt-48 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit mx-auto md:mx-0">
        {[
          { id: 'activity', label: 'Legislative Activity', icon: FileText },
          { id: 'hearings', label: 'Hearings', icon: Calendar },
          { id: 'money', label: 'Money', icon: Landmark },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200",
              activeTab === tab.id 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-slate-900">Sponsored Bills</h2>
                <span className="text-sm font-medium text-slate-500">{bills.length} Active Bills</span>
              </div>
              {bills.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {bills.map(bill => <BillCard key={bill.id} bill={bill} />)}
                </div>
              ) : (
                <div className="p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-slate-900">Upcoming Hearings</h2>
                <span className="text-sm font-medium text-slate-500">{hearings.length} Scheduled</span>
              </div>
              {hearings.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {hearings.map(hearing => <HearingCard key={hearing.id} hearing={hearing} />)}
                </div>
              ) : (
                <div className="p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
                  <p className="text-slate-500">No upcoming hearings found for this member's committees.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'money' && finance && (
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
    </div>
  );
}
