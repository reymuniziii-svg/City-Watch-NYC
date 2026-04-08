import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const userId = await validateClerkJWT(req.headers.get('Authorization'));
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  try {
    const { plan, successUrl, cancelUrl } = await req.json();

    if (plan !== 'advocate' && plan !== 'enterprise') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId =
      plan === 'advocate'
        ? Deno.env.get('STRIPE_ADVOCATE_PRICE_ID')
        : Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID');

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Price not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: profile?.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: userId, plan },
      success_url: successUrl ?? `${req.headers.get('origin')}/billing?success=true`,
      cancel_url: cancelUrl ?? `${req.headers.get('origin')}/billing?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
