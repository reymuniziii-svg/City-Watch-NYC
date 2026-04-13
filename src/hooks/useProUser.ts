import { useUser, useSession } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, callEdgeFunction } from '../services/supabaseClient';

const OWNER_ID = 'user_3CBInTW2eAXEABQpFJ7czG6U2kp';

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
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return FREE_STATE;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { session } = useSession();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [tier, setTier] = useState<Tier>('free');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'active' | 'past_due' | 'canceled'>('none');

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isSignedIn || !clerkUser || !isSupabaseConfigured() || !session) {
      setTier('free');
      setSubscriptionStatus('none');
      return;
    }
    setIsLoading(true);

    session.getToken()
      .then(async (token) => {
        const data = await callEdgeFunction<{
          profile: { tier?: string; email?: string; display_name?: string } | null;
          subscription: { plan?: string; status?: string } | null;
        }>('get-user-profile', { method: 'GET', token });

        const sub = data.subscription;
        const profileTier = (data.profile?.tier as Tier) ?? 'free';

        if (sub && sub.status === 'active' && sub.plan) {
          setTier(sub.plan as Tier);
          setSubscriptionStatus('active');
        } else if (sub) {
          setTier(profileTier);
          setSubscriptionStatus((sub.status as 'none' | 'active' | 'past_due' | 'canceled') ?? 'none');
        } else {
          setTier(profileTier);
          setSubscriptionStatus('none');
        }
      })
      .catch(() => {
        setTier('free');
        setSubscriptionStatus('none');
      })
      .finally(() => setIsLoading(false));
  }, [isSignedIn, clerkUser?.id, session]);

  if (!isLoaded) return { ...FREE_STATE, isLoading: true };

  if (clerkUser?.id === OWNER_ID) {
    return {
      isAuthenticated: true,
      isPro: true,
      isEnterprise: true,
      user: {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        displayName: clerkUser.fullName ?? clerkUser.firstName ?? '',
      },
      tier: 'enterprise',
      isLoading: false,
      subscriptionStatus: 'active',
    };
  }

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
