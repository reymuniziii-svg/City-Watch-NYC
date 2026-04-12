import React from 'react';
import { Calendar, FileText, Loader2, Megaphone, Search, Users } from 'lucide-react';
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

  if (type === 'lobbying') {
    return Megaphone;
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

  if (type === 'lobbying') {
    return 'Lobbying Org';
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

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Search index is not JSON');
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
          className="w-full border-editorial bg-white py-3 pl-11 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black rounded-none"
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
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden border-editorial bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-black" />
              <span>Loading search index...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-black">
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
                      <div className="mt-0.5 border-editorial bg-white p-2 text-black">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="border-editorial bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                            {getResultLabel(result.type)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-bold text-black">{result.label}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{result.subtitle}</p>
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
