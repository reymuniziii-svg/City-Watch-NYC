import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getPriceId(plan: string, billing: string): string | undefined {
  if (plan === 'advocate') {
    return billing === 'yearly'
      ? Deno.env.get('STRIPE_ADVOCATE_YEARLY_PRICE_ID')
      : Deno.env.get('STRIPE_ADVOCATE_PRICE_ID');
  }
  if (plan === 'enterprise') {
    return billing === 'yearly'
      ? Deno.env.get('STRIPE_ENTERPRISE_YEARLY_PRICE_ID')
      : Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID');
  }
  return undefined;
}

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

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  try {
    const { plan, billing = 'monthly', successUrl, cancelUrl } = await req.json();

    if (plan !== 'advocate' && plan !== 'enterprise') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId = getPriceId(plan, billing);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Price not configured for ${plan}/${billing}` }), {
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

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const origin = req.headers.get('origin') ?? Deno.env.get('APP_URL') ?? '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: profile?.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: userId, plan, billing },
      subscription_data: {
        metadata: { user_id: userId, plan, billing },
      },
      success_url: successUrl ?? `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${origin}/pricing`,
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
