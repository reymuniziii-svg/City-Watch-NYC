import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Loader2, FileText, Landmark, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchAddress, getDistrictFromBBL } from '../services/nycDataService';

export default function AddressSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const navigate = useNavigate();
  const debounceTimer = useRef<any>(null);

  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.properties.label);
    setSuggestions([]);
    setIsLocating(true);
    try {
      const bbl = suggestion.properties.addendum?.pad?.bbl;
      if (!bbl) {
        alert("We couldn't find a City Council district for this address. Please try a more specific NYC address.");
        return;
      }
      const district = await getDistrictFromBBL(bbl);
      if (district) {
        navigate(`/members/district/${district}`);
      } else {
        alert("We couldn't find a City Council district for this address. Please make sure it's in NYC.");
      }
    } catch (error) {
      console.error('District lookup error:', error);
    } finally {
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

  return (
    <div className="max-w-3xl mx-auto py-12 md:py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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

        <form onSubmit={handleSubmit} className="relative group max-w-xl mx-auto" ref={containerRef}>
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
            type="text"
            className="block w-full pl-12 pr-24 py-5 bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all text-lg placeholder:text-slate-400 rounded-none"
            placeholder="Enter your NYC address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
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

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-0 text-left border-editorial">
          {[
            { title: 'Track Bills', desc: 'See what laws are being proposed and how they affect you.', icon: FileText },
            { title: 'Follow Money', desc: 'Transparent campaign finance data for every member.', icon: Landmark },
            { title: 'Attend Hearings', desc: 'Stay informed about upcoming committee meetings.', icon: Calendar },
          ].map((feature, i) => (
            <div key={i} className="p-8 bg-white border-r-editorial last:border-r-0 hover:bg-slate-50 transition-colors">
              <feature.icon className="w-8 h-8 text-black mb-6" strokeWidth={1.5} />
              <h3 className="font-editorial font-bold text-xl text-black mb-3">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
