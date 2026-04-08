import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export type ProTier = 'free' | 'advocate' | 'enterprise';
type Tier = ProTier;

export interface ProUserState {
  isAuthenticated: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  user: { id: string; email: string; displayName: string } | null;
  tier: Tier;
  isLoading: boolean;
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'canceled';
}

const FREE_STATE: ProUserState = {
  isAuthenticated: false,
  isPro: false,
  isEnterprise: false,
  user: null,
  tier: 'free',
  isLoading: false,
  subscriptionStatus: 'none',
};

export function useProUser(): ProUserState {
  // Build-time constant — when Clerk key is absent the early return ensures
  // hooks below are never reached, satisfying rules-of-hooks (branch is stable).
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return FREE_STATE;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [tier, setTier] = useState<Tier>('free');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [subscriptionStatus, setSubscriptionStatus] = useState<ProUserState['subscriptionStatus']>('none');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isLoading, setIsLoading] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isSignedIn || !clerkUser || !isSupabaseConfigured()) {
      setTier('free');
      setSubscriptionStatus('none');
      return;
    }
    setIsLoading(true);
    Promise.resolve(
      supabase!
        .from('profiles')
        .select('tier, subscription_status')
        .eq('id', clerkUser.id)
        .single()
    )
      .then(({ data }: { data: { tier?: string; subscription_status?: string } | null }) => {
        setTier((data?.tier as Tier) ?? 'free');
        setSubscriptionStatus(
          (data?.subscription_status as ProUserState['subscriptionStatus']) ?? 'none'
        );
      })
      .catch(() => {
        setTier('free');
        setSubscriptionStatus('none');
      })
      .finally(() => setIsLoading(false));
  }, [isSignedIn, clerkUser?.id]);

  if (!isLoaded) return { ...FREE_STATE, isLoading: true };

  return {
    isAuthenticated: !!isSignedIn,
    isPro: tier === 'advocate' || tier === 'enterprise',
    isEnterprise: tier === 'enterprise',
    user: clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
          displayName: clerkUser.fullName ?? clerkUser.firstName ?? '',
        }
      : null,
    tier,
    isLoading,
    subscriptionStatus,
  };
}
