import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MessageSquareText, Search, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import ProGate from './ProGate';
import {
  keywordSearchTranscripts,
  semanticSearchTranscripts,
  type TranscriptSearchResult,
} from '../services/transcriptSearchService';

type SearchMode = 'keyword' | 'semantic';

const SENTIMENT_STYLES: Record<string, { bg: string; text: string }> = {
  supportive: { bg: 'bg-green-100', text: 'text-green-800' },
  opposed: { bg: 'bg-red-100', text: 'text-red-800' },
  neutral: { bg: 'bg-slate-100', text: 'text-slate-700' },
  contentious: { bg: 'bg-amber-100', text: 'text-amber-800' },
};

const INTENSITY_BAR_COLORS: Record<string, string> = {
  supportive: 'bg-green-500',
  opposed: 'bg-red-500',
  neutral: 'bg-slate-400',
  contentious: 'bg-amber-500',
};

function SentimentBadge({ sentiment, intensity }: { sentiment: string; intensity?: number }) {
  const style = SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral;
  const barColor = INTENSITY_BAR_COLORS[sentiment] ?? INTENSITY_BAR_COLORS.neutral;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${style.bg} ${style.text}`}>
      {sentiment}
      {intensity != null && (
        <span className="inline-block w-8 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <span
            className={`block h-full rounded-full ${barColor}`}
            style={{ width: `${Math.round(intensity * 100)}%` }}
          />
        </span>
      )}
    </span>
  );
}

function ResultCard({ result, mode }: { result: TranscriptSearchResult; mode: SearchMode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-editorial p-6 hover:shadow-sm transition-shadow"
    >
      <div className="flex flex-col gap-3">
        {/* Top row: metadata badges */}
        <div className="flex flex-wrap items-center gap-2">
          {result.speaker && (
            <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              {result.speaker}
            </span>
          )}
          {result.bodyName && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {result.bodyName}
            </span>
          )}
          {result.date && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {result.date}
            </span>
          )}
          {result.sentiment && (
            <SentimentBadge sentiment={result.sentiment} intensity={result.intensity} />
          )}
          {mode === 'semantic' && result.similarity != null && (
            <span className="inline-block bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              {Math.round(result.similarity * 100)}% match
            </span>
          )}
        </div>

        {/* Excerpt */}
        <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
          {result.excerpt}
        </p>

        {/* Chapter link */}
        {result.chapterUrl && (
          <a
            href={result.chapterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:text-slate-600 transition-colors group"
          >
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            View on CityMeetings.nyc
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function HearingSuperSearch() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [results, setResults] = useState<TranscriptSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { canUseSemanticSearch } = useFeatureFlags();

  const performSearch = useCallback(
    async (searchQuery: string, searchMode: SearchMode) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const searchResults =
          searchMode === 'semantic'
            ? await semanticSearchTranscripts(trimmed)
            : await keywordSearchTranscripts(trimmed);
        setResults(searchResults);
        setHasSearched(true);
      } catch {
        setError('Search failed. Please try again.');
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, mode);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, mode, performSearch]);

  const handleModeChange = (newMode: SearchMode) => {
    if (newMode === 'semantic' && !canUseSemanticSearch) {
      // Don't actually switch - ProGate overlay handles it
      return;
    }
    setMode(newMode);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <MessageSquareText className="w-8 h-8 text-black" />
          <h1 className="font-editorial text-5xl font-black text-black tracking-tighter">
            Transcript Search
          </h1>
        </div>
        <p className="text-slate-600">
          Search hearing transcripts by keyword or use AI-powered semantic search to find relevant testimony.
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
          <input
            type="text"
            placeholder={
              mode === 'semantic'
                ? 'Describe what you are looking for...'
                : 'Search by speaker, keyword, or committee...'
            }
            className="w-full pl-14 pr-4 py-4 text-lg bg-white border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all rounded-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search hearing transcripts"
          />
        </div>
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1 border-b border-slate-200"
      >
        <button
          onClick={() => handleModeChange('keyword')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
            mode === 'keyword'
              ? 'border-black text-black'
              : 'border-transparent text-slate-500 hover:text-black'
          }`}
        >
          Keyword
        </button>

        {canUseSemanticSearch ? (
          <button
            onClick={() => handleModeChange('semantic')}
            className={`flex items-center gap-1.5 px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              mode === 'semantic'
                ? 'border-black text-black'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Semantic
          </button>
        ) : (
          <div className="relative">
            <ProGate flag="canUseSemanticSearch" feature="Semantic Search">
              <button
                className="flex items-center gap-1.5 px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-slate-500"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Semantic
              </button>
            </ProGate>
          </div>
        )}
      </motion.div>

      {/* Results */}
      <div className="space-y-4">
        {/* Loading */}
        {isSearching && (
          <div className="flex items-center justify-center py-16 bg-white border-editorial">
            <Loader2 className="w-6 h-6 animate-spin text-black mr-3" />
            <span className="text-sm text-slate-600">
              {mode === 'semantic' ? 'Running semantic search...' : 'Searching transcripts...'}
            </span>
          </div>
        )}

        {/* Error */}
        {error && !isSearching && (
          <div className="text-center py-16 bg-white border-editorial">
            <p className="text-sm text-red-600 font-bold uppercase tracking-widest">{error}</p>
          </div>
        )}

        {/* Empty state - no query */}
        {!isSearching && !hasSearched && !error && (
          <div className="text-center py-20 bg-white border-editorial flex flex-col items-center justify-center">
            <MessageSquareText className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              Search hearing transcripts
            </p>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              Enter a keyword, speaker name, or topic to search across council hearing transcripts.
            </p>
          </div>
        )}

        {/* No results */}
        {!isSearching && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-20 bg-white border-editorial flex flex-col items-center justify-center">
            <MessageSquareText className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              No results found
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Try different keywords or broaden your search.
            </p>
          </div>
        )}

        {/* Results list */}
        {!isSearching && results.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-4">
              {results.map((result, i) => (
                <ResultCard
                  key={`${result.eventId}-${result.speaker}-${i}`}
                  result={result}
                  mode={mode}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
