import { useProUser } from '../hooks/useProUser';
import { Zap, Building2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusConfig = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  past_due: {
    label: 'Past Due',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  canceled: {
    label: 'Canceled',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
  },
} as const;

export default function SubscriptionStatus() {
  const { tier, subscriptionStatus } = useProUser();

  if (tier === 'free' || subscriptionStatus === 'none') return null;

  const planIcon = tier === 'enterprise' ? Building2 : Zap;
  const PlanIcon = planIcon;
  const planName = tier === 'enterprise' ? 'Enterprise' : 'Advocate';
  const config = statusConfig[subscriptionStatus];
  const StatusIcon = config.icon;

  return (
    <div className="border-editorial bg-white p-6">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
        Your Subscription
      </p>

      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Plan info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-editorial bg-slate-50 flex items-center justify-center shrink-0">
            <PlanIcon className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="font-editorial text-lg font-bold text-black">{planName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${config.bg} ${config.text} ${config.border} border`}
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
          </div>
        </div>

        {/* Manage button */}
        <Link
          to="/pricing"
          className="px-4 py-2 border-editorial text-xs font-bold uppercase tracking-widest text-black hover:bg-slate-50 transition-colors"
        >
          Manage Subscription
        </Link>
      </div>

      {subscriptionStatus === 'past_due' && (
        <p className="text-xs text-amber-700 mt-3">
          Your payment is past due. Please update your billing information to avoid service interruption.
        </p>
      )}
      {subscriptionStatus === 'canceled' && (
        <p className="text-xs text-red-700 mt-3">
          Your subscription has been canceled. You will retain access until the end of your current billing period.
        </p>
      )}
    </div>
  );
}
