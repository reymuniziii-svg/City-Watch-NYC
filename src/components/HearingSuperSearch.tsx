import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, ExternalLink, MessageSquareQuote, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProGate from './ProGate';
import type { HearingVectorChunk } from '../services/hearingSearchService';

interface ChunkWithTitle extends HearingVectorChunk {
  hearingTitle?: string;
}

const RESULT_LIMIT = 20;
const DEBOUNCE_MS = 300;

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        terms.some((t) => part.toLowerCase() === t) ? (
          <mark key={i} className="bg-amber-200 text-black px-0.5 rounded-sm">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function searchChunks(chunks: ChunkWithTitle[], query: string): ChunkWithTitle[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (terms.length === 0) return [];

  const scored = chunks
    .map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      const speakerLower = chunk.speaker.toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (textLower.includes(term)) score += 10;
        if (speakerLower.includes(term)) score += 5;

        // Bonus for exact phrase within text
        const idx = textLower.indexOf(term);
        if (idx >= 0) {
          // Boost early matches
          score += Math.max(0, 5 - Math.floor(idx / 100));
        }
      }

      // Bonus if all terms appear
      const allMatch = terms.every((t) => textLower.includes(t) || speakerLower.includes(t));
      if (allMatch) score += 20;

      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULT_LIMIT)
    .map((item) => item.chunk);

  return scored;
}

function HearingSuperSearchInner() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [chunks, setChunks] = useState<ChunkWithTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch('/data/hearing-vectors.json');
        if (!response.ok) throw new Error('Failed to load vectors');
        const data = (await response.json()) as ChunkWithTitle[];
        if (active) setChunks(data);
      } catch (error) {
        console.error('Error loading hearing vectors:', error);
        if (active) setChunks([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () => searchChunks(chunks, debouncedQuery),
    [chunks, debouncedQuery],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-editorial text-xl font-bold text-black mb-1">
          Hearing Transcript Search
        </h3>
        <p className="text-sm text-slate-500">
          Search across hearing transcripts, quotes, and summaries.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          placeholder="Search hearing transcripts..."
          className="w-full border-editorial bg-white py-3 pl-11 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black rounded-none"
          aria-label="Search hearing transcripts"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 px-4 py-5 text-sm text-slate-500 border-editorial">
          <Loader2 className="h-4 w-4 animate-spin text-black" />
          <span>Loading hearing data...</span>
        </div>
      )}

      <AnimatePresence>
        {!isLoading && debouncedQuery.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {results.length > 0 ? (
              <div className="border-editorial divide-y divide-slate-200">
                <div className="px-4 py-2 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {results.map((result, idx) => (
                  <div key={`${result.hearingId}-${result.chunkIndex}-${idx}`} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {result.speaker ? (
                          <MessageSquareQuote className="w-4 h-4 text-slate-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        {result.speaker && (
                          <span className="inline-block px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest mb-1">
                            {result.speaker}
                          </span>
                        )}
                        <p className="text-sm text-black leading-relaxed line-clamp-3">
                          {highlightMatch(result.text, debouncedQuery)}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                            {result.hearingId}
                          </span>
                          {result.chapterUrl && (
                            <a
                              href={result.chapterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-black hover:text-slate-600 uppercase tracking-widest underline shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-5 text-sm text-slate-500 border-editorial">
                No matches found for "{debouncedQuery.trim()}".
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HearingSuperSearch() {
  return (
    <ProGate feature="Hearing Transcript Search" flag="canUseSemanticSearch">
      <HearingSuperSearchInner />
    </ProGate>
  );
}
