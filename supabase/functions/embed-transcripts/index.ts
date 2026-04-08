import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const GEMINI_EMBEDDING_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`;
const EMBEDDING_DIMENSIONS = 768;

/** Approximate token count for chunking (1 token ~= 4 chars). */
const CHUNK_TARGET_CHARS = 500 * 4; // ~500 tokens
const CHUNK_OVERLAP_CHARS = 50 * 4; // ~50 tokens

/** How many chunks to send to the embedding API per sequential batch. */
const EMBED_BATCH_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscriptSearchEntry {
  eventId: number;
  bodyName: string;
  date: string;
  speaker: string;
  excerpt: string;
  chapterUrl: string;
}

interface TextChunk {
  eventId: number;
  chunkIndex: number;
  text: string;
  speaker: string;
  chapterTitle: string;
  chapterUrl: string;
}

// ---------------------------------------------------------------------------
// Chunking helpers
// ---------------------------------------------------------------------------

/**
 * Split a long text into overlapping segments of approximately
 * `CHUNK_TARGET_CHARS` characters, breaking on sentence boundaries when
 * possible.
 */
function splitText(text: string): string[] {
  if (text.length <= CHUNK_TARGET_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_TARGET_CHARS, text.length);

    // Try to break on a sentence boundary (". ") within the last 20% of the window
    if (end < text.length) {
      const searchStart = Math.max(start, end - Math.floor(CHUNK_TARGET_CHARS * 0.2));
      const window = text.slice(searchStart, end);
      const lastPeriod = window.lastIndexOf('. ');
      if (lastPeriod !== -1) {
        end = searchStart + lastPeriod + 2; // include the period and space
      }
    }

    chunks.push(text.slice(start, end).trim());

    // Move start forward, subtracting overlap
    start = Math.max(start + 1, end - CHUNK_OVERLAP_CHARS);
  }

  return chunks.filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// Embedding helpers
// ---------------------------------------------------------------------------

async function embedSingle(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(GEMINI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedding API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimensions: got ${values?.length ?? 0}, expected ${EMBEDDING_DIMENSIONS}`,
    );
  }
  return values;
}

/**
 * Embed an array of texts sequentially in batches of EMBED_BATCH_SIZE.
 * Returns an array of embedding vectors in the same order as the input.
 */
async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await Promise.all(batch.map((t) => embedSingle(t, apiKey)));
    results.push(...embeddings);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ---- Environment ----------------------------------------------------------

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
  const appUrl = Deno.env.get('APP_URL') ?? '';

  if (!serviceRoleKey || !geminiApiKey || !appUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing required environment variables (SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, APP_URL)' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Service-role client for writes (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ---- 1. Fetch transcript search index -----------------------------------

    const indexUrl = `${appUrl}/data/transcript-search-index.json`;
    const indexRes = await fetch(indexUrl, { signal: AbortSignal.timeout(30000) });
    if (!indexRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch transcript index from ${indexUrl}: ${indexRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const entries: TranscriptSearchEntry[] = await indexRes.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Transcript index is empty, nothing to embed', embedded: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 2. Determine which event IDs already have embeddings ---------------

    const { data: existingRows, error: existingError } = await supabase
      .from('transcript_embeddings')
      .select('event_id')
      .limit(10000);

    if (existingError) {
      throw new Error(`Failed to query existing embeddings: ${existingError.message}`);
    }

    const existingEventIds = new Set<number>(
      (existingRows ?? []).map((r: { event_id: number }) => r.event_id),
    );

    // Filter to only new entries
    const newEntries = entries.filter((e) => !existingEventIds.has(e.eventId));
    if (newEntries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All transcripts already embedded', embedded: 0, skipped: entries.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 3. Build text chunks -----------------------------------------------

    const allChunks: TextChunk[] = [];

    for (const entry of newEntries) {
      const segments = splitText(entry.excerpt);
      for (let i = 0; i < segments.length; i++) {
        allChunks.push({
          eventId: entry.eventId,
          chunkIndex: i,
          text: segments[i],
          speaker: entry.speaker,
          chapterTitle: '', // search index doesn't carry chapter title
          chapterUrl: entry.chapterUrl,
        });
      }
    }

    if (allChunks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No chunks to embed', embedded: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- 4. Generate embeddings ---------------------------------------------

    const texts = allChunks.map((c) => c.text);
    const embeddings = await embedBatch(texts, geminiApiKey);

    // ---- 5. Upsert into transcript_embeddings --------------------------------

    const rows = allChunks.map((chunk, idx) => ({
      event_id: chunk.eventId,
      chunk_index: chunk.chunkIndex,
      chunk_text: chunk.text,
      speaker: chunk.speaker || null,
      chapter_title: chunk.chapterTitle || null,
      chapter_url: chunk.chapterUrl || null,
      timestamp_label: null,
      embedding: `[${embeddings[idx].join(',')}]`,
    }));

    // Insert in batches of 100 to avoid payload limits
    const INSERT_BATCH = 100;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const batch = rows.slice(i, i + INSERT_BATCH);
      const { error: insertError } = await supabase
        .from('transcript_embeddings')
        .insert(batch);

      if (insertError) {
        throw new Error(`Insert failed at batch ${i}: ${insertError.message}`);
      }
      insertedCount += batch.length;
    }

    // ---- 6. Return summary --------------------------------------------------

    return new Response(
      JSON.stringify({
        message: 'Embedding complete',
        embedded: insertedCount,
        skipped: entries.length - newEntries.length,
        newEvents: newEntries.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
