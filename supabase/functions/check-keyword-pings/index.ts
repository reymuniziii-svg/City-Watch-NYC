import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const appUrl = Deno.env.get('APP_URL') ?? '';

  // 1. Get all hearing_keyword watchlist items
  const { data: watchItems, error: watchError } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('item_type', 'hearing_keyword');

  if (watchError || !watchItems?.length) {
    return new Response(JSON.stringify({
      usersNotified: 0,
      matchesFound: 0,
      error: watchError?.message ?? 'No hearing keywords found',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Collect unique keywords
  const uniqueKeywords = [...new Set(watchItems.map((w: any) => w.item_value as string))];

  // 3. Search transcript_embeddings for recent matches (last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Map: keyword -> matching chunks
  const keywordMatches: Record<string, any[]> = {};

  for (const keyword of uniqueKeywords) {
    const { data: chunks, error: chunkError } = await supabase
      .from('transcript_embeddings')
      .select('id, event_id, chunk_text, speaker, chapter_url, created_at')
      .gte('created_at', since)
      .ilike('chunk_text', `%${keyword}%`);

    if (chunkError) {
      console.error(`Error searching for keyword "${keyword}":`, chunkError);
      continue;
    }

    if (chunks?.length) {
      keywordMatches[keyword] = chunks;
    }
  }

  // 4. Group matches by user
  // userMatches: userId -> { keyword, chunks }[]
  const userMatches: Record<string, { keyword: string; label: string; chunks: any[] }[]> = {};

  for (const item of watchItems) {
    const matches = keywordMatches[item.item_value];
    if (!matches?.length) continue;

    if (!userMatches[item.user_id]) {
      userMatches[item.user_id] = [];
    }
    userMatches[item.user_id].push({
      keyword: item.item_value,
      label: item.item_label ?? item.item_value,
      chunks: matches,
    });
  }

  // 5. Send notification emails
  let usersNotified = 0;
  let totalMatches = 0;

  for (const [userId, matchGroups] of Object.entries(userMatches)) {
    try {
      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!profile?.email) continue;

      const userName = profile.display_name || 'there';

      // Build HTML email
      let html = `<h2>Hearing Keyword Alert</h2>`;
      html += `<p>Hi ${userName},</p>`;
      html += `<p>Keywords you're tracking were mentioned in recent hearing transcripts:</p>`;

      for (const group of matchGroups) {
        totalMatches += group.chunks.length;
        html += `<h3>"${group.label}" &mdash; ${group.chunks.length} mention${group.chunks.length > 1 ? 's' : ''}</h3>`;
        html += `<ul>`;

        for (const chunk of group.chunks) {
          const excerpt = chunk.chunk_text.length > 200
            ? chunk.chunk_text.substring(0, 200) + '...'
            : chunk.chunk_text;
          const speaker = chunk.speaker ? `<strong>${chunk.speaker}</strong>: ` : '';
          const link = chunk.chapter_url
            ? `<br/><a href="${chunk.chapter_url}">Watch on CityMeetings.nyc</a>`
            : '';
          html += `<li>${speaker}${excerpt}${link}</li>`;
        }

        html += `</ul>`;
      }

      html += `<p><a href="${appUrl}/watchlist">Manage your hearing keywords</a></p>`;
      html += `<p style="color:#666;font-size:12px;">Council Watch NYC</p>`;

      // Send via Resend
      if (resendApiKey) {
        const keywordList = matchGroups.map((g) => g.label).join(', ');
        const subject = matchGroups.length === 1
          ? `Keyword Alert: "${matchGroups[0].label}" mentioned in hearing transcript`
          : `Keyword Alert: ${matchGroups.length} keywords mentioned in hearing transcripts`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Council Watch NYC <alerts@councilwatch.nyc>',
            to: profile.email,
            subject,
            html,
          }),
        });

        if (emailRes.ok) {
          usersNotified++;
        } else {
          console.error(`Failed to send email to ${profile.email}:`, await emailRes.text());
        }
      }
    } catch (err) {
      console.error(`Failed to process keyword pings for user ${userId}:`, err);
    }
  }

  return new Response(JSON.stringify({ usersNotified, matchesFound: totalMatches }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
