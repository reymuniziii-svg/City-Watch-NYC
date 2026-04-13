import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function upsertSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    userId: string;
    plan: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodEnd: number;
  }
) {
  await supabase.from('subscriptions').upsert({
    user_id: params.userId,
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    plan: params.plan,
    status: params.status,
    current_period_end: new Date(params.currentPeriodEnd * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  await supabase
    .from('profiles')
    .update({ tier: params.status === 'active' ? params.plan : 'free' })
    .eq('id', params.userId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Missing signature or webhook secret' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Webhook signature verification failed: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      // Primary: checkout completed — most reliable source of user_id + plan
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan || session.mode !== 'subscription') break;

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id;

        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await upsertSubscription(supabase, {
          userId,
          plan,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
        });

        break;
      }

      // Backup: subscription created (metadata propagated via subscription_data.metadata)
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const plan = subscription.metadata?.plan;

        if (!userId || !plan) break;

        await upsertSubscription(supabase, {
          userId,
          plan,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const plan = subscription.metadata?.plan;

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            ...(plan ? { plan } : {}),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (plan) {
          const tier = subscription.status === 'active' ? plan : 'free';
          await supabase.from('profiles').update({ tier }).eq('id', userId);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        await supabase.from('profiles').update({ tier: 'free' }).eq('id', userId);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription as Stripe.Subscription | null)?.id;

        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase
          .from('subscriptions')
          .update({
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            status: sub.status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
