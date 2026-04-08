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
}

const FREE_STATE: ProUserState = {
  isAuthenticated: false,
  isPro: false,
  isEnterprise: false,
  user: null,
  tier: 'free',
  isLoading: false,
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
  const [isLoading, setIsLoading] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isSignedIn || !clerkUser || !isSupabaseConfigured()) {
      setTier('free');
      return;
    }
    setIsLoading(true);
    Promise.resolve(
      supabase!
        .from('profiles')
        .select('tier')
        .eq('id', clerkUser.id)
        .single()
    )
      .then(({ data }: { data: { tier?: string } | null }) => {
        setTier((data?.tier as Tier) ?? 'free');
      })
      .catch(() => setTier('free'))
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
  };
}
