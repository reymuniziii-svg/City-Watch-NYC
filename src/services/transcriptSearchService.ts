import Fuse from 'fuse.js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface TranscriptSearchResult {
  eventId: number;
  bodyName: string;
  date: string;
  speaker: string;
  excerpt: string;
  chapterUrl: string;
  sentiment?: string;
  intensity?: number;
  similarity?: number;
}

interface TranscriptSearchEntry {
  eventId: number;
  bodyName: string;
  date: string;
  speaker: string;
  excerpt: string;
  chapterUrl: string;
}

let searchIndex: Fuse<TranscriptSearchEntry> | null = null;
let rawEntries: TranscriptSearchEntry[] | null = null;

async function loadSearchIndex(): Promise<Fuse<TranscriptSearchEntry>> {
  if (searchIndex && rawEntries) return searchIndex;
  const res = await fetch('/data/transcript-search-index.json');
  rawEntries = (await res.json()) as TranscriptSearchEntry[];
  searchIndex = new Fuse(rawEntries, {
    keys: ['speaker', 'excerpt', 'bodyName'],
    threshold: 0.4,
    includeScore: true,
  });
  return searchIndex;
}

// Free tier: keyword search using Fuse.js
export async function keywordSearchTranscripts(
  query: string,
): Promise<TranscriptSearchResult[]> {
  const fuse = await loadSearchIndex();
  const results = fuse.search(query, { limit: 30 });
  return results.map((r) => ({ ...r.item }));
}

// Pro tier: semantic search via Supabase RPC
export async function semanticSearchTranscripts(
  query: string,
): Promise<TranscriptSearchResult[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return keywordSearchTranscripts(query); // fallback
  }

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  // Fallback: also check the non-VITE prefixed key that might be available
  const apiKey =
    geminiKey || (import.meta.env.GEMINI_API_KEY as string | undefined);
  if (!apiKey) {
    return keywordSearchTranscripts(query); // fallback if no key
  }

  // Generate query embedding via Gemini
  const embRes = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: query }] },
      }),
    },
  );

  if (!embRes.ok) {
    return keywordSearchTranscripts(query); // fallback
  }

  const embData = await embRes.json();
  const queryEmbedding = embData.embedding?.values;
  if (!queryEmbedding) {
    return keywordSearchTranscripts(query);
  }

  // Call Supabase RPC
  const { data, error } = await supabase.rpc('search_transcripts', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 20,
  });

  if (error || !data) {
    return keywordSearchTranscripts(query);
  }

  // Enrich with sentiment data
  const eventIds = [
    ...new Set((data as any[]).map((r: any) => r.event_id)),
  ];
  let sentimentMap = new Map<
    string,
    { sentiment: string; intensity: number }
  >();

  if (eventIds.length > 0) {
    const { data: sentiments } = await supabase
      .from('transcript_sentiment')
      .select('chunk_id, sentiment, intensity')
      .in('event_id', eventIds);

    if (sentiments) {
      for (const s of sentiments) {
        sentimentMap.set(s.chunk_id, {
          sentiment: s.sentiment,
          intensity: s.intensity,
        });
      }
    }
  }

  return (data as any[]).map((row: any) => ({
    eventId: row.event_id,
    bodyName: '', // not in RPC response
    date: '',
    speaker: row.speaker || 'Unknown',
    excerpt: row.chunk_text?.substring(0, 300) || '',
    chapterUrl: row.chapter_url || '',
    similarity: row.similarity,
    sentiment: sentimentMap.get(row.id)?.sentiment,
    intensity: sentimentMap.get(row.id)?.intensity,
  }));
}
