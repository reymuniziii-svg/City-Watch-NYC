import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, Zap, Shield, Building2, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '@clerk/clerk-react';
import { useProUser, type ProTier } from '../hooks/useProUser';
import { isSupabaseConfigured, callEdgeFunction } from '../services/supabaseClient';
import SubscriptionStatus from './SubscriptionStatus';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Tier {
  id: ProTier;
  name: string;
  icon: React.ElementType;
  monthlyPrice: number;
  yearlyPrice: number;
  tagline: string;
  cta: string;
  features: string[];
  highlighted?: boolean;
}

const tiers: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    icon: Shield,
    monthlyPrice: 0,
    yearlyPrice: 0,
    tagline: 'Full transparency for every New Yorker',
    cta: 'Current Plan',
    features: [
      'Full council member directory',
      'Bill tracker with AI summaries',
      'Hearing schedule and transcripts',
      'Campaign finance data',
      'District map explorer',
      'Global search',
    ],
  },
  {
    id: 'advocate',
    name: 'Advocate',
    icon: Zap,
    monthlyPrice: 9,
    yearlyPrice: 89,
    tagline: 'Deeper analysis for civic power users',
    cta: 'Upgrade',
    highlighted: true,
    features: [
      'Everything in Free',
      'Influence Mapper',
      'Conflict-of-interest alerts',
      'Watchlists with email alerts',
      'AI-powered analysis tools',
      'Priority data refresh',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    monthlyPrice: 29,
    yearlyPrice: 279,
    tagline: 'Built for newsrooms, orgs, and researchers',
    cta: 'Upgrade',
    features: [
      'Everything in Advocate',
      'API access',
      'Bulk data export',
      'Custom alert rules',
      'Dedicated support',
      'Team accounts',
    ],
  },
];

/* Feature-comparison rows: [label, free, advocate, enterprise] */
const comparisonRows: [string, boolean, boolean, boolean][] = [
  ['Council member profiles', true, true, true],
  ['Bill tracker with AI summaries', true, true, true],
  ['Hearing schedule & transcripts', true, true, true],
  ['Campaign finance data', true, true, true],
  ['District map explorer', true, true, true],
  ['Global search', true, true, true],
  ['Influence Mapper', false, true, true],
  ['Conflict-of-interest alerts', false, true, true],
  ['Watchlists with email alerts', false, true, true],
  ['AI-powered analysis', false, true, true],
  ['Priority data refresh', false, true, true],
  ['API access', false, false, true],
  ['Bulk data export', false, false, true],
  ['Custom alert rules', false, false, true],
  ['Dedicated support', false, false, true],
  ['Team accounts', false, false, true],
];

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
  {
    q: 'Will the free tier always stay free?',
    a: 'Yes. Council Watch was built to make NYC government transparent to everyone. The core data -- members, bills, hearings, campaign finance, and search -- will always be free and open.',
  },
  {
    q: 'What is the Influence Mapper?',
    a: 'The Influence Mapper visualizes connections between donors, lobbyists, and council members so you can trace who funds whom and how that money flows into policy decisions.',
  },
  {
    q: 'How do watchlists and email alerts work?',
    a: 'Create watchlists of bills, members, or topics. When something changes -- a new vote, an amended bill, a hearing added -- you get a notification straight to your inbox.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. No contracts, no lock-in. Cancel from your account page and your plan reverts to Free at the end of the billing period.',
  },
  {
    q: 'What counts as a "team account"?',
    a: 'Enterprise plans include up to 10 seats under a single subscription with shared watchlists, export quotas, and centralized billing. Need more seats? Get in touch.',
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function BillingToggle({
  billing,
  onToggle,
}: {
  billing: 'monthly' | 'yearly';
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <span
        className={`text-xs font-bold uppercase tracking-widest transition-colors ${
          billing === 'monthly' ? 'text-black' : 'text-slate-400'
        }`}
      >
        Monthly
      </span>
      <button
        onClick={onToggle}
        className="relative w-12 h-6 border-editorial bg-white rounded-none flex items-center transition-colors"
        aria-label="Toggle billing period"
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-black transition-transform duration-200 ${
            billing === 'yearly' ? 'translate-x-[26px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span
        className={`text-xs font-bold uppercase tracking-widest transition-colors ${
          billing === 'yearly' ? 'text-black' : 'text-slate-400'
        }`}
      >
        Yearly
      </span>
      {billing === 'yearly' && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-100 px-2 py-0.5">
          Save ~17%
        </span>
      )}
    </div>
  );
}

function TierCard({
  tier,
  billing,
  currentTier,
  index,
  onUpgrade,
  isAuthenticated,
}: {
  tier: Tier;
  billing: 'monthly' | 'yearly';
  currentTier: ProTier;
  index: number;
  onUpgrade?: (plan: ProTier) => void;
  isAuthenticated?: boolean;
}) {
  const isCurrent = currentTier === tier.id;
  const price = billing === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
  const period = billing === 'monthly' ? '/mo' : '/yr';
  const Icon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.1 }}
      className={`relative flex flex-col border-editorial bg-white p-8 ${
        tier.highlighted ? 'ring-2 ring-black' : ''
      }`}
    >
      {tier.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
          Most Popular
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 border-editorial bg-slate-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-black" />
        </div>
        <h3 className="font-editorial text-2xl font-bold text-black">{tier.name}</h3>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed mb-6">{tier.tagline}</p>

      {/* Price */}
      <div className="mb-6">
        {price === 0 ? (
          <span className="font-editorial text-4xl font-black text-black">$0</span>
        ) : (
          <>
            <span className="font-editorial text-4xl font-black text-black">
              ${price}
            </span>
            <span className="text-sm text-slate-400 ml-1">{period}</span>
          </>
        )}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div className="w-full py-3.5 border-editorial bg-slate-50 text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-8">
          Current Plan
        </div>
      ) : onUpgrade && isAuthenticated ? (
        <button
          onClick={() => onUpgrade(tier.id)}
          className="w-full py-3.5 border-editorial bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors mb-8"
        >
          {tier.cta}
        </button>
      ) : onUpgrade && !isAuthenticated ? (
        <button
          disabled
          className="w-full py-3.5 border-editorial bg-black text-white text-xs font-bold uppercase tracking-widest mb-8 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Sign in to upgrade"
        >
          Sign in to Upgrade
        </button>
      ) : (
        <button
          disabled
          className="w-full py-3.5 border-editorial bg-black text-white text-xs font-bold uppercase tracking-widest mb-8 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Coming soon"
        >
          {tier.cta}
        </button>
      )}

      {/* Feature list */}
      <ul className="space-y-3 flex-1">
        {tier.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-black shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700 leading-snug">{feat}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function ComparisonTable() {
  return (
    <div className="bg-white border-editorial overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b-editorial bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Feature
            </th>
            {['Free', 'Advocate', 'Enterprise'].map((name) => (
              <th
                key={name}
                className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparisonRows.map(([label, free, advocate, enterprise], i) => (
            <tr
              key={label}
              className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
            >
              <td className="px-6 py-3 text-sm text-slate-700">{label}</td>
              {[free, advocate, enterprise].map((has, j) => (
                <td key={j} className="px-6 py-3 text-center">
                  {has ? (
                    <Check className="w-4 h-4 text-black mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-slate-300 mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-editorial text-3xl font-black text-black text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div className="border-editorial divide-y divide-black/10">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <button
              key={i}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full text-left px-6 py-5 flex items-start gap-4 hover:bg-slate-50 transition-colors"
            >
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
              <div className="flex-1">
                <p className="font-bold text-sm text-black">{faq.q}</p>
                {isOpen && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-slate-500 leading-relaxed mt-2"
                  >
                    {faq.a}
                  </motion.p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const { tier: currentTier, isAuthenticated, subscriptionStatus } = useProUser();
  const { session } = useSession();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [searchParams] = useSearchParams();
  const showSuccess = searchParams.get('success') === 'true';
  const sessionId = searchParams.get('session_id');

  const handleCheckout = async (plan: ProTier) => {
    if (!isSupabaseConfigured() || !session) return;

    try {
      const token = await session.getToken();
      const data = await callEdgeFunction<{ url?: string }>('create-checkout-session', {
        method: 'POST',
        token,
        body: {
          plan,
          billing,
          successUrl: window.location.origin + '/pricing?success=true&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.origin + '/pricing',
        },
      });

      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const upgradeHandler = isSupabaseConfigured() ? handleCheckout : undefined;

  return (
    <div className="space-y-16">
      {/* Success banner */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 p-4 text-center space-y-1"
        >
          <p className="text-green-800 font-bold text-sm">
            Welcome to Council Watch Pro! Your subscription is now active.
          </p>
          {sessionId && (
            <p className="text-green-700 text-xs">
              Confirmation: <span className="font-mono">{sessionId}</span>
            </p>
          )}
        </motion.div>
      )}

      {/* Subscription status for subscribed users */}
      {subscriptionStatus !== 'none' && <SubscriptionStatus />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-2xl mx-auto"
      >
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Council Watch Pro
        </p>
        <h1 className="font-editorial text-5xl md:text-6xl font-black text-black tracking-tighter mb-4">
          Transparency at Every Level
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed">
          The core data is free forever. Pro tiers unlock deeper analysis,
          real-time alerts, and the tools civic watchdogs and newsrooms need
          to hold power accountable.
        </p>

        <BillingToggle billing={billing} onToggle={() => setBilling((b) => (b === 'monthly' ? 'yearly' : 'monthly'))} />
      </motion.div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-black md:border-editorial">
        {tiers.map((tier, i) => (
          <TierCard
            key={tier.id}
            tier={tier}
            billing={billing}
            currentTier={currentTier}
            index={i}
            onUpgrade={upgradeHandler}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      {/* Feature comparison */}
      <div>
        <h2 className="font-editorial text-3xl font-black text-black text-center mb-8">
          Full Feature Comparison
        </h2>
        <ComparisonTable />
      </div>

      {/* FAQ */}
      <FAQSection />

      {/* Footer note */}
      {!isSupabaseConfigured() && (
        <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center leading-relaxed pb-4">
          Pricing is informational. Payment integration coming soon.
        </p>
      )}
    </div>
  );
}
