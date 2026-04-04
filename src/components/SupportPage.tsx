import React, { useState } from 'react';
import { Heart, Server, Cpu, Globe, ExternalLink } from 'lucide-react';
import donationConfig, { type DonationTier } from '../data/donationConfig';

type Mode = 'oneTime' | 'monthly';

function DonationButton({ tier }: { tier: DonationTier }) {
  const isConfigured = tier.url !== '#';

  if (!isConfigured) {
    return (
      <div className="group relative">
        <button
          disabled
          className="w-full px-6 py-4 border-editorial bg-slate-50 text-slate-400 font-bold text-sm uppercase tracking-widest cursor-not-allowed"
        >
          {tier.label}
        </button>
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Coming soon
        </div>
      </div>
    );
  }

  return (
    <a
      href={tier.url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2 px-6 py-4 border-editorial bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
    >
      {tier.label}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

const costs = [
  {
    icon: Cpu,
    label: 'AI Processing',
    description: 'Google Gemini powers bill summaries, hearing analysis, and the chat assistant — every query costs real money.',
  },
  {
    icon: Server,
    label: 'Hosting & Compute',
    description: 'The app runs 24/7, rebuilding its dataset nightly from live NYC government sources.',
  },
  {
    icon: Globe,
    label: 'Data & APIs',
    description: 'Fetching and enriching data from NYC Open Data, NYC Legistar, CityMeetings.nyc, and the NYC Campaign Finance Board.',
  },
];

export default function SupportPage() {
  const [mode, setMode] = useState<Mode>('oneTime');

  const tiers = mode === 'oneTime' ? donationConfig.oneTime : donationConfig.monthly;
  const isCustomConfigured = donationConfig.customUrl !== '#';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="w-6 h-6 text-black" />
          <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Support the Project</span>
        </div>
        <h1 className="font-editorial text-5xl font-black text-black leading-tight mb-4">
          Keep City Watch Running
        </h1>
        <p className="text-slate-600 leading-relaxed text-lg">
          City Watch NYC is an independent, non-commercial project — no ads, no investors, no institutional backing.
          It exists to make NYC's legislative process legible to everyday New Yorkers. If it's been useful to you, consider helping cover the costs.
        </p>
      </div>

      <div className="border-editorial bg-white p-8 mb-8">
        <h2 className="font-editorial text-xl font-bold text-black mb-6">What your support covers</h2>
        <div className="space-y-5">
          {costs.map(({ icon: Icon, label, description }) => (
            <div key={label} className="flex items-start gap-4">
              <div className="w-9 h-9 border-editorial bg-slate-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="font-bold text-sm text-black mb-1">{label}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-editorial bg-white p-8">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setMode('oneTime')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border-editorial transition-colors ${
              mode === 'oneTime' ? 'bg-black text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            One-time
          </button>
          <button
            onClick={() => setMode('monthly')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border-editorial transition-colors ${
              mode === 'monthly' ? 'bg-black text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Monthly
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {tiers.map((tier) => (
            <DonationButton key={tier.label} tier={tier} />
          ))}
        </div>

        {mode === 'oneTime' && (
          <div className="mt-3">
            {isCustomConfigured ? (
              <a
                href={donationConfig.customUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 border-editorial bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                Custom amount
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <div className="group relative">
                <button
                  disabled
                  className="w-full px-6 py-4 border-editorial bg-slate-50 text-slate-400 font-bold text-sm uppercase tracking-widest cursor-not-allowed"
                >
                  Custom amount
                </button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Coming soon
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-5 text-center leading-relaxed">
          Payments processed securely by Stripe. City Watch NYC is not a registered nonprofit — donations are not tax-deductible.
        </p>
      </div>
    </div>
  );
}
