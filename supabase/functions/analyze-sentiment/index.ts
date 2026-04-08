import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash';
const BATCH_SIZE = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Fetch all transcript chunks
    const { data: allChunks, error: chunksError } = await supabase
      .from('transcript_embeddings')
      .select('id, event_id, chunk_text, speaker');

    if (chunksError || !allChunks) {
      return new Response(JSON.stringify({ error: 'Failed to fetch transcript chunks' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch already-analyzed chunk IDs
    const { data: existingSentiment } = await supabase
      .from('transcript_sentiment')
      .select('chunk_id');

    const analyzedIds = new Set(
      (existingSentiment ?? []).map((s: { chunk_id: string }) => s.chunk_id),
    );

    // Filter to only unanalyzed chunks
    const unanalyzed = allChunks.filter(
      (c: { id: string }) => !analyzedIds.has(c.id),
    );

    if (unanalyzed.length === 0) {
      return new Response(JSON.stringify({ analyzed: 0, skipped: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        results: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              chunk_id: { type: 'STRING' },
              sentiment: { type: 'STRING', enum: ['supportive', 'opposed', 'neutral', 'contentious'] },
              intensity: { type: 'NUMBER' },
              topics: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['chunk_id', 'sentiment', 'intensity', 'topics'],
          },
        },
      },
      required: ['results'],
    };

    let totalAnalyzed = 0;
    let totalSkipped = 0;

    // Process in batches of 10
    for (let i = 0; i < unanalyzed.length; i += BATCH_SIZE) {
      const batch = unanalyzed.slice(i, i + BATCH_SIZE);

      const chunkList = batch.map((c: { id: string; speaker: string | null; chunk_text: string }) =>
        `- ID: ${c.id}\n  Speaker: ${c.speaker ?? 'Unknown'}\n  Text: ${c.chunk_text}`
      ).join('\n\n');

      const geminiRes = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: 'You are a sentiment analyst for NYC City Council hearing transcripts. For each transcript chunk, classify the sentiment as: supportive (speaker supports the topic), opposed (speaker opposes), neutral (informational/procedural), or contentious (debate/disagreement). Rate intensity 0-1. Extract key topics discussed.' }],
            },
            contents: [{
              role: 'user',
              parts: [{ text: `Analyze the sentiment of each transcript chunk below:\n\n${chunkList}` }],
            }],
            generationConfig: {
              candidateCount: 1,
              maxOutputTokens: 4096,
              temperature: 0,
              responseMimeType: 'application/json',
              responseJsonSchema: responseSchema,
            },
          }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (!geminiRes.ok) {
        totalSkipped += batch.length;
        continue;
      }

      const payload = await geminiRes.json();
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
        .trim();

      if (!text) {
        totalSkipped += batch.length;
        continue;
      }

      let parsed: { results: { chunk_id: string; sentiment: string; intensity: number; topics: string[] }[] };
      try {
        parsed = JSON.parse(text);
      } catch {
        totalSkipped += batch.length;
        continue;
      }

      if (!parsed.results || !Array.isArray(parsed.results)) {
        totalSkipped += batch.length;
        continue;
      }

      // Build a lookup for event_id from the batch
      const eventIdMap = new Map(
        batch.map((c: { id: string; event_id: number }) => [c.id, c.event_id]),
      );

      const rows = parsed.results
        .filter((r) => eventIdMap.has(r.chunk_id))
        .map((r) => ({
          event_id: eventIdMap.get(r.chunk_id)!,
          chunk_id: r.chunk_id,
          sentiment: r.sentiment,
          intensity: Math.max(0, Math.min(1, r.intensity)),
          topics: r.topics ?? [],
        }));

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from('transcript_sentiment')
          .insert(rows);

        if (insertError) {
          totalSkipped += batch.length;
          continue;
        }

        totalAnalyzed += rows.length;
        totalSkipped += batch.length - rows.length;
      } else {
        totalSkipped += batch.length;
      }
    }

    return new Response(JSON.stringify({ analyzed: totalAnalyzed, skipped: totalSkipped }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
