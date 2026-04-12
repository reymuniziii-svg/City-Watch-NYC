import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Loader2, FileText, Landmark, Calendar, X as XIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchAddress, getDistrictFromBBL, fetchMembers, fetchBills, fetchMemberMetrics, getCampaignFinance } from '../services/nycDataService';
import type { CouncilMember, Bill, CampaignFinance, MemberMetrics } from '../types';

interface DistrictPreview {
  member: CouncilMember;
  metrics: MemberMetrics | null;
  finance: CampaignFinance | null;
  hotBill: Bill | null;
  resolvedAddress: string;
  isVacant: boolean;
}

function gradeColor(grade: string | null): string {
  if (!grade) return 'bg-slate-100 text-slate-700';
  if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800';
  if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  return '$' + Math.round(value).toLocaleString();
}

const defaultFeatureCards = [
  { title: 'Track Bills', desc: 'See what laws are being proposed and how they affect you.', icon: FileText },
  { title: 'Follow Money', desc: 'Transparent campaign finance data for every member.', icon: Landmark },
  { title: 'Attend Hearings', desc: 'Stay informed about upcoming committee meetings.', icon: Calendar },
];

export default function AddressSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [preview, setPreview] = useState<DistrictPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const debounceTimer = useRef<any>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadIdRef = useRef(0);

  const isPreviewMode = preview !== null || previewLoading;

  // Click-outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced address search
  useEffect(() => {
    if (query.length < 3 || isLocating) {
      setSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchAddress(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [query, isLocating]);

  // Load lightweight preview data for a district
  const loadPreview = async (district: number, addressLabel: string) => {
    const currentLoadId = ++loadIdRef.current;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const [members, allMetrics, allBills] = await Promise.all([
        fetchMembers(),
        fetchMemberMetrics(),
        fetchBills(),
      ]);

      if (currentLoadId !== loadIdRef.current) return;

      const member = members.find(m => m.district === district);
      if (!member) {
        setPreview({
          member: {
            id: '',
            name: `District ${district}`,
            district,
            party: '',
            borough: 'NYC',
            neighborhoods: [],
            committees: [],
            contact: { email: '', phone: '', website: '' },
          },
          metrics: null,
          finance: null,
          hotBill: null,
          resolvedAddress: addressLabel,
          isVacant: true,
        });
        setPreviewLoading(false);
        return;
      }

      const metrics = allMetrics.find(m => m.slug === member.id) ?? null;

      const hotBill = allBills
        .filter(b => b.leadSponsorSlug === member.id)
        .sort((a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime())
        [0] ?? null;

      const finance = await getCampaignFinance(member.id);

      if (currentLoadId !== loadIdRef.current) return;

      setPreview({ member, metrics, finance, hotBill, resolvedAddress: addressLabel, isVacant: false });
    } catch (err) {
      console.error('Preview load error:', err);
      if (currentLoadId === loadIdRef.current) {
        setPreviewError('Something went wrong loading the preview. Please try again.');
      }
    } finally {
      if (currentLoadId === loadIdRef.current) {
        setPreviewLoading(false);
      }
    }
  };

  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.properties.label);
    setSuggestions([]);
    setIsLocating(true);
    try {
      const bbl = suggestion.properties.addendum?.pad?.bbl;
      if (!bbl) {
        alert("We couldn't find a City Council district for this address. Please try a more specific NYC address.");
        setIsLocating(false);
        return;
      }
      const district = await getDistrictFromBBL(bbl);
      if (district) {
        setIsLocating(false);
        await loadPreview(district, suggestion.properties.label);
      } else {
        alert("We couldn't find a City Council district for this address. Please make sure it's in NYC.");
        setIsLocating(false);
      }
    } catch (error) {
      console.error('District lookup error:', error);
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      await handleSelect(suggestions[0]);
    } else if (query.length >= 3) {
      setIsLocating(true);
      try {
        const results = await searchAddress(query);
        if (results.length > 0) {
          await handleSelect(results[0]);
        } else {
          alert("No address found for your search.");
          setIsLocating(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        setIsLocating(false);
      }
    }
  };

  const handleReset = () => {
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setQuery('');
    inputRef.current?.focus();
  };

  // Contextual feature cards when preview is available
  const featureCards = preview && !preview.isVacant
    ? [
        {
          title: `${preview.member.name.split(' ').slice(-1)[0]} sponsored ${preview.member.sponsoredBillsCount ?? 0} bills`,
          desc: 'Track every bill your council member has introduced, co-sponsored, or voted on.',
          icon: FileText,
        },
        {
          title: `Follow ${preview.member.name.split(' ').slice(-1)[0]}'s money`,
          desc: preview.finance
            ? `${preview.member.name} raised ${formatCurrency(preview.finance.totalRaised)} from ${preview.finance.contributorCount} contributors.`
            : 'See transparent campaign finance data for your representative.',
          icon: Landmark,
        },
        {
          title: `Hearings in District ${preview.member.district}`,
          desc: 'Stay informed about upcoming committee meetings affecting your neighborhood.',
          icon: Calendar,
        },
      ]
    : defaultFeatureCards;

  return (
    <div className={`mx-auto transition-all duration-500 ${isPreviewMode ? 'max-w-5xl py-8 md:py-12' : 'max-w-3xl py-12 md:py-20'}`}>

      {/* Hero Content — above search bar, collapses on exit */}
      <AnimatePresence>
        {!isPreviewMode && (
          <motion.div
            key="hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, transition: { opacity: { duration: 0.2 }, height: { duration: 0.3, delay: 0.1, ease: 'easeInOut' } } }}
            transition={{ duration: 0.5 }}
            className="text-center overflow-hidden"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest mb-8">
              <MapPin className="w-3 h-3" />
              <span>NYC Civic Empowerment</span>
            </div>
            <h1 className="font-editorial text-6xl md:text-8xl font-black text-black tracking-tighter mb-8 leading-[0.9]">
              Find Your Voice<br />
              <span className="italic font-light">in City Hall</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Enter your address to find your City Council member, track local bills, and see who's funding your representatives.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar — always visible, repositions via layout */}
      <motion.div layout transition={{ layout: { duration: 0.4, ease: 'easeInOut' } }} className={isPreviewMode ? '' : 'text-center'}>
        <form onSubmit={handleSubmit} className={`relative group mx-auto ${isPreviewMode ? 'max-w-2xl' : 'max-w-xl'}`} ref={containerRef}>
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-black animate-spin" />
            ) : (
              <button type="submit" className="p-1 hover:bg-slate-100 transition-colors">
                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-black" />
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            className="block w-full pl-12 pr-28 py-5 bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all text-lg placeholder:text-slate-400 rounded-none"
            placeholder="Enter your NYC address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {isPreviewMode && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-black transition-colors"
                aria-label="Clear search"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="bg-black text-white px-6 py-2 font-bold text-sm uppercase tracking-wider hover:bg-slate-800 transition-colors mr-2 rounded-none"
            >
              Search
            </button>
          </div>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-white border-editorial overflow-hidden text-left rounded-none"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(s);
                    }}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b-editorial last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-black font-medium">{s.properties.label}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {isLocating && (
          <div className="mt-6 flex items-center justify-center gap-2 text-black font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Locating your district...</span>
          </div>
        )}
      </motion.div>

      {/* Preview Content — skeleton or full preview card */}
      <AnimatePresence mode="wait">
        {/* Skeleton */}
        {previewLoading && !preview && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8"
          >
            <div className="bg-white border-editorial p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-slate-100 animate-pulse" />
                  </div>
                  <div className="h-12 w-64 max-w-full bg-slate-100 animate-pulse" />
                  <div className="h-4 w-48 max-w-full bg-slate-100 animate-pulse" />
                  <div className="grid grid-cols-3 gap-0 border-editorial mt-6">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`p-4 ${i < 2 ? 'border-r-editorial' : ''}`}>
                        <div className="h-3 w-12 bg-slate-100 animate-pulse mb-3" />
                        <div className="h-8 w-10 bg-slate-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 h-20 bg-slate-50 animate-pulse border-editorial" />
            </div>
          </motion.div>
        )}

        {/* Full Preview */}
        {preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            {preview.isVacant ? (
              <div className="bg-white border-editorial p-8 md:p-12 text-center">
                <h2 className="font-editorial text-3xl font-bold text-black mb-4">
                  District {preview.member.district} is Currently Vacant
                </h2>
                <p className="text-slate-600 mb-8">This seat does not currently have a seated council member.</p>
                <Link
                  to={`/members/district/${preview.member.district}`}
                  className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 font-bold text-sm uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  View district details <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="bg-white border-editorial p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">

                  {/* Photo + District Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
                    className="relative shrink-0"
                  >
                    <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden border-editorial">
                      <img
                        src={preview.member.photoUrl || `https://picsum.photos/seed/${preview.member.id}/400/400`}
                        alt={preview.member.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-black text-white w-12 h-12 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5">Dist</span>
                      <span className="font-editorial text-lg font-black leading-none">{preview.member.district}</span>
                    </div>
                  </motion.div>

                  {/* Info Column */}
                  <div className="flex-1 text-center md:text-left w-full">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 }}
                    >
                      <span className="inline-block px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest">
                        {preview.member.party}
                      </span>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 }}
                      className="font-editorial text-4xl md:text-5xl font-black text-black tracking-tighter mt-3 leading-none"
                    >
                      {preview.member.name}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="text-sm text-slate-600 mt-3 leading-relaxed"
                    >
                      Representing{' '}
                      <span className="font-semibold text-black">
                        {preview.member.neighborhoods.length > 0
                          ? preview.member.neighborhoods.join(', ')
                          : `District ${preview.member.district}`}
                      </span>
                    </motion.p>

                    {/* Stats Row */}
                    <div className="mt-6 grid grid-cols-3 gap-0 border-editorial">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                        className="p-4 bg-white border-r-editorial"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bills</p>
                        <p className="font-editorial text-3xl font-bold text-black mt-1">
                          {preview.member.sponsoredBillsCount ?? '—'}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        className="p-4 bg-white border-r-editorial"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Grassroots</p>
                        {preview.finance?.grassrootsGrade ? (
                          <span className={`inline-block mt-1 px-2 py-0.5 font-editorial text-2xl font-bold ${gradeColor(preview.finance.grassrootsGrade)}`}>
                            {preview.finance.grassrootsGrade}
                          </span>
                        ) : (
                          <p className="font-editorial text-3xl font-bold text-slate-300 mt-1">—</p>
                        )}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.35 }}
                        className="p-4 bg-white"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Donor</p>
                        <p className="font-bold text-black mt-1 text-sm leading-tight truncate">
                          {preview.finance?.topIndustries?.[0]?.label ?? '—'}
                        </p>
                        {preview.finance?.topIndustries?.[0] && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatCurrency(preview.finance.topIndustries[0].amount)}
                          </p>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Hot Bill */}
                {preview.hotBill && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.4, ease: 'easeOut' }}
                    className="mt-6 p-5 bg-slate-50 border-editorial"
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="px-2 py-0.5 border-editorial text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        {preview.hotBill.introNumber || preview.hotBill.number}
                      </span>
                      <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest">
                        {preview.hotBill.status}
                      </span>
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Latest Bill
                      </span>
                    </div>
                    <h4 className="font-editorial text-lg font-bold text-black leading-snug line-clamp-2">
                      {preview.hotBill.title}
                    </h4>
                  </motion.div>
                )}

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="mt-6 flex flex-col sm:flex-row items-center gap-4"
                >
                  <Link
                    to={`/members/${preview.member.id}`}
                    className="w-full sm:w-auto text-center bg-black text-white px-8 py-3 font-bold text-sm uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    See full profile <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleReset}
                    className="text-slate-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors"
                  >
                    Search another address
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {previewError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-50 border border-red-200 text-center"
        >
          <p className="text-sm text-red-800 mb-2">{previewError}</p>
          <button
            onClick={handleReset}
            className="text-red-800 hover:text-red-900 font-bold text-xs uppercase tracking-widest underline"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Feature Cards — generic or contextual */}
      <AnimatePresence mode="wait">
        <motion.div
          key={preview ? 'contextual' : 'default'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
          transition={{ duration: 0.3, delay: isPreviewMode ? 0.55 : 0 }}
          className={`${isPreviewMode ? 'mt-8' : 'mt-16'} grid grid-cols-1 md:grid-cols-3 gap-0 text-left border-editorial`}
        >
          {featureCards.map((feature, i) => (
            <motion.div
              key={`${preview ? 'ctx' : 'def'}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (isPreviewMode ? 0.55 : 0) + i * 0.05 }}
              className="p-8 bg-white border-r-editorial last:border-r-0 hover:bg-slate-50 transition-colors"
            >
              <feature.icon className="w-8 h-8 text-black mb-6" strokeWidth={1.5} />
              <h3 className="font-editorial font-bold text-xl text-black mb-3">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
