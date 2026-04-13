import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash';
const BATCH_SIZE = 20;

interface BillClassification {
  billId: string;
  introNumber: string;
  title: string;
  classification: 'Opportunity' | 'Threat' | 'Conflict' | 'Neutral';
  reasoning: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // GET — list reports for the authenticated user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('impact_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = await validateClerkJWT(req.headers.get('Authorization'));
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  // Check Pro subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!sub) {
    return new Response(JSON.stringify({ error: 'Active Pro subscription required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { platformId } = await req.json();
    if (!platformId) {
      return new Response(JSON.stringify({ error: 'platformId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: platform, error: platError } = await supabase
      .from('policy_platforms')
      .select('*')
      .eq('id', platformId)
      .eq('user_id', userId)
      .single();

    if (platError || !platform) {
      return new Response(JSON.stringify({ error: 'Platform not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from('policy-platforms')
      .download(platform.storage_path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: 'Could not download platform file' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const platformText = await fileData.text();

    if (!platformText.trim()) {
      return new Response(JSON.stringify({ error: 'Could not extract text from platform file' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: report, error: reportError } = await supabase
      .from('impact_reports')
      .insert({ user_id: userId, platform_id: platformId, status: 'processing' })
      .select('id')
      .single();

    if (reportError || !report) throw new Error('Failed to create impact report');

    await supabase.from('policy_platforms').update({ status: 'processing' }).eq('id', platformId);

    const appUrl = Deno.env.get('APP_URL') ?? '';
    let billsData: any[] = [];
    try {
      const res = await fetch(`${appUrl}/data/bills-index.json`);
      if (res.ok) billsData = await res.json();
    } catch { /* */ }

    if (billsData.length === 0) {
      await supabase.from('impact_reports').update({ status: 'error', error_message: 'No bills data available' }).eq('id', report.id);
      return new Response(JSON.stringify({ error: 'No bills data available' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      await supabase.from('impact_reports').update({ status: 'error', error_message: 'AI service not configured' }).eq('id', report.id);
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allResults: BillClassification[] = [];
    const batches: any[][] = [];
    for (let i = 0; i < billsData.length; i += BATCH_SIZE) {
      batches.push(billsData.slice(i, i + BATCH_SIZE));
    }

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        results: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              billId: { type: 'STRING' },
              introNumber: { type: 'STRING' },
              title: { type: 'STRING' },
              classification: { type: 'STRING', enum: ['Opportunity', 'Threat', 'Conflict', 'Neutral'] },
              reasoning: { type: 'STRING' },
              confidence: { type: 'NUMBER' },
            },
            required: ['billId', 'introNumber', 'title', 'classification', 'reasoning', 'confidence'],
          },
        },
      },
      required: ['results'],
    };

    for (const batch of batches) {
      const billList = batch.map((b: any) => `- ${b.introNumber}: ${b.title} (Status: ${b.statusName || 'Unknown'})`).join('\n');

      const geminiRes = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: 'You are a policy analyst. Given an organization\'s policy platform and a list of legislative bills, classify each bill relative to the platform as: Opportunity (aligns with platform goals), Threat (contradicts platform goals), Conflict (mixed impact), or Neutral (no clear relationship). Provide reasoning and a confidence score between 0 and 1.' }],
            },
            contents: [{
              role: 'user',
              parts: [{ text: `ORGANIZATION POLICY PLATFORM:\n${platformText.substring(0, 10000)}\n\nBILLS TO CLASSIFY:\n${billList}` }],
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

      if (geminiRes.ok) {
        const payload = await geminiRes.json();
        const text = payload.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.results) allResults.push(...parsed.results);
          } catch { /* skip malformed batch */ }
        }
      }
    }

    const reportJson = { results: allResults };
    await supabase.from('impact_reports').update({ status: 'complete', report_json: reportJson }).eq('id', report.id);
    await supabase.from('policy_platforms').update({ status: 'analyzed' }).eq('id', platformId);

    return new Response(JSON.stringify({ reportId: report.id, billsAnalyzed: allResults.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
