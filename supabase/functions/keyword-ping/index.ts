import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HearingQuote {
  speaker: string;
  quote: string;
  chapterTitle: string;
  chapterUrl: string;
}

interface HearingSummary {
  id: string;
  title: string;
  overview: string;
  takeaways: string[];
  quotes: HearingQuote[];
}

interface WatchlistItem {
  user_id: string;
  item_type: string;
  item_value: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Use service role key for background job
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const enrichmentUrl: string | undefined = body.enrichmentUrl;

  if (!enrichmentUrl) {
    return new Response(
      JSON.stringify({ error: 'enrichmentUrl is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 1. Fetch enrichment data
  let hearings: HearingSummary[] = [];
  try {
    const res = await fetch(enrichmentUrl);
    if (res.ok) {
      hearings = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch enrichment data:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch enrichment data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!hearings.length) {
    return new Response(
      JSON.stringify({ pingsCreated: 0, message: 'No hearings found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Get all keyword watchlist items across all users
  const { data: keywordItems, error: watchlistError } = await supabase
    .from('watchlist_items')
    .select('user_id, item_type, item_value')
    .eq('item_type', 'keyword');

  if (watchlistError || !keywordItems?.length) {
    return new Response(
      JSON.stringify({ pingsCreated: 0, error: watchlistError?.message ?? 'No keyword watchlist items' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Scan each hearing for keyword matches
  const pings: {
    user_id: string;
    keyword: string;
    hearing_id: string;
    hearing_title: string;
    matched_quote: string;
    created_at: string;
  }[] = [];

  for (const item of keywordItems as WatchlistItem[]) {
    const keyword = item.item_value;
    const keywordLower = keyword.toLowerCase();

    for (const hearing of hearings) {
      // Search overview
      if (hearing.overview.toLowerCase().includes(keywordLower)) {
        pings.push({
          user_id: item.user_id,
          keyword,
          hearing_id: hearing.id,
          hearing_title: hearing.title,
          matched_quote: hearing.overview.slice(0, 500),
          created_at: new Date().toISOString(),
        });
        continue; // One ping per keyword-hearing pair
      }

      // Search takeaways
      const matchedTakeaway = hearing.takeaways.find(
        (t) => t.toLowerCase().includes(keywordLower)
      );
      if (matchedTakeaway) {
        pings.push({
          user_id: item.user_id,
          keyword,
          hearing_id: hearing.id,
          hearing_title: hearing.title,
          matched_quote: matchedTakeaway,
          created_at: new Date().toISOString(),
        });
        continue;
      }

      // Search quotes
      const matchedQuote = hearing.quotes.find(
        (q) => q.quote.toLowerCase().includes(keywordLower)
      );
      if (matchedQuote) {
        pings.push({
          user_id: item.user_id,
          keyword,
          hearing_id: hearing.id,
          hearing_title: hearing.title,
          matched_quote: `${matchedQuote.speaker}: "${matchedQuote.quote}"`.slice(0, 500),
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // 4. Batch insert pings
  let pingsCreated = 0;
  if (pings.length > 0) {
    const { error: insertError, count } = await supabase
      .from('keyword_pings')
      .insert(pings);

    if (insertError) {
      console.error('Failed to insert pings:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message, pingsAttempted: pings.length }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    pingsCreated = count ?? pings.length;
  }

  return new Response(
    JSON.stringify({ pingsCreated }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
