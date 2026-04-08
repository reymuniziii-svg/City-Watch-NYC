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

  // Use service role key for background job
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const frequency = body.frequency ?? 'weekly';

  // 1. Get all enabled users matching frequency
  const { data: alertUsers, error: alertError } = await supabase
    .from('alert_preferences')
    .select('user_id, last_sent_at')
    .eq('enabled', true)
    .eq('frequency', frequency);

  if (alertError || !alertUsers?.length) {
    return new Response(JSON.stringify({ sent: 0, error: alertError?.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Fetch bills data
  const appUrl = Deno.env.get('APP_URL') ?? '';
  let billsData: any[] = [];
  try {
    const res = await fetch(`${appUrl}/data/bills-index.json`);
    if (res.ok) billsData = await res.json();
  } catch { /* no bills data available */ }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  let sentCount = 0;

  // 3. Process each user
  for (const alertUser of alertUsers) {
    try {
      // Get user's watchlist
      const { data: watchItems } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('user_id', alertUser.user_id);

      if (!watchItems?.length) continue;

      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', alertUser.user_id)
        .single();

      if (!profile?.email) continue;

      // Find bill changes since last_sent_at
      const watchedBillValues = watchItems
        .filter((w: any) => w.item_type === 'bill')
        .map((w: any) => w.item_value);

      const lastSent = alertUser.last_sent_at ? new Date(alertUser.last_sent_at) : new Date(0);

      const changedBills = billsData.filter((bill: any) => {
        if (!watchedBillValues.includes(bill.introNumber)) return false;
        if (!bill.actionDate) return false;
        return new Date(bill.actionDate) > lastSent;
      });

      // Find watched members' new bills
      const watchedMemberSlugs = watchItems
        .filter((w: any) => w.item_type === 'member')
        .map((w: any) => w.item_value);

      const newMemberBills = billsData.filter((bill: any) => {
        if (!watchedMemberSlugs.includes(bill.leadSponsorSlug)) return false;
        if (!bill.introDate) return false;
        return new Date(bill.introDate) > lastSent;
      });

      if (changedBills.length === 0 && newMemberBills.length === 0) continue;

      // Build HTML digest
      const userName = profile.display_name || 'there';
      let html = `<h2>Council Watch Digest</h2><p>Hi ${userName},</p>`;

      if (changedBills.length > 0) {
        html += `<h3>Watched Bills with Updates</h3><ul>`;
        for (const bill of changedBills) {
          html += `<li><strong>${bill.introNumber}</strong>: ${bill.title} — Status: ${bill.statusName || 'Updated'}</li>`;
        }
        html += `</ul>`;
      }

      if (newMemberBills.length > 0) {
        html += `<h3>New Bills from Watched Members</h3><ul>`;
        for (const bill of newMemberBills) {
          html += `<li><strong>${bill.introNumber}</strong>: ${bill.title}</li>`;
        }
        html += `</ul>`;
      }

      html += `<p><a href="${appUrl}/watchlist">View your full watchlist</a></p>`;
      html += `<p style="color:#666;font-size:12px;">Council Watch NYC</p>`;

      // Send via Resend
      if (resendApiKey) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Council Watch NYC <alerts@councilwatch.nyc>',
            to: profile.email,
            subject: `Council Watch ${frequency === 'daily' ? 'Daily' : 'Weekly'} Digest`,
            html,
          }),
        });

        if (emailRes.ok) {
          sentCount++;
          // Update last_sent_at
          await supabase
            .from('alert_preferences')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('user_id', alertUser.user_id);
        }
      }
    } catch (err) {
      console.error(`Failed to process digest for user ${alertUser.user_id}:`, err);
    }
  }

  return new Response(JSON.stringify({ sent: sentCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
