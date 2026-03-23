import React from 'react';
import { Calendar, FileText, Loader2, Search, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SearchDocument } from '../lib/types';
import { createSearchIndex } from '../lib/search';

const RESULT_LIMIT = 8;

function getResultIcon(type: SearchDocument['type']) {
  if (type === 'member') {
    return Users;
  }

  if (type === 'hearing') {
    return Calendar;
  }

  return FileText;
}

function getResultLabel(type: SearchDocument['type']) {
  if (type === 'member') {
    return 'Member';
  }

  if (type === 'hearing') {
    return 'Hearing';
  }

  return 'Bill';
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = React.useState('');
  const [documents, setDocuments] = React.useState<SearchDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function loadDocuments() {
      setIsLoading(true);

      try {
        const response = await fetch('/data/search-index.json');
        if (!response.ok) {
          throw new Error('Failed to load search index');
        }

        const payload: SearchDocument[] = await response.json();
        if (active) {
          setDocuments(payload);
        }
      } catch (error) {
        console.error('Error loading search index:', error);
        if (active) {
          setDocuments([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    setIsOpen(false);
    setQuery('');
  }, [location.pathname, location.search]);

  const index = React.useMemo(() => createSearchIndex(documents), [documents]);

  const results = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return [] as SearchDocument[];
    }

    return index.search(trimmed, { limit: RESULT_LIMIT }).map((entry) => entry.item);
  }, [index, query]);

  const handleSelect = React.useCallback((route: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(route);
  }, [navigate]);

  const showPanel = isOpen && (query.trim().length > 0 || isLoading);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          placeholder="Search bills, members, hearings..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          aria-label="Search council data"
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
        />
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          {isLoading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Loading search index...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {results.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(result.route)}
                    >
                      <div className="mt-0.5 rounded-2xl bg-slate-100 p-2 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                            {getResultLabel(result.type)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-semibold text-slate-900">{result.label}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{result.subtitle}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-5 text-sm text-slate-500">
              No matches found for "{query.trim()}".
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
