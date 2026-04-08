/**
 * Stub hook for pro-user tier detection.
 * Will be wired to Clerk metadata once payment integration lands.
 */
export type ProTier = 'free' | 'advocate' | 'enterprise';

export interface ProUser {
  tier: ProTier;
  isPro: boolean;
}

export function useProUser(): ProUser {
  // TODO: read tier from Clerk user publicMetadata once payments are live
  return { tier: 'free', isPro: false };
}
