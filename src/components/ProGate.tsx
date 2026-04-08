import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import type { FeatureFlags } from '../lib/featureFlags';

interface ProGateProps {
  children: React.ReactNode;
  fallbackCount?: number;
  feature?: string;
  flag?: keyof FeatureFlags;
}

export default function ProGate({ children, feature = 'this feature', flag }: ProGateProps) {
  const { isPro } = useProUser();
  const flags = useFeatureFlags();

  const hasAccess = flag ? flags[flag] : isPro;
  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center p-8 max-w-md">
          <Lock className="w-8 h-8 text-slate-400 mx-auto mb-4" />
          <h3 className="font-editorial text-2xl font-bold text-black mb-2">
            Unlock {feature}
          </h3>
          <p className="text-slate-600 mb-6 text-sm">
            Upgrade to Pro for full access to advanced civic intelligence tools.
          </p>
          <Link
            to="/pricing"
            className="inline-block px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
