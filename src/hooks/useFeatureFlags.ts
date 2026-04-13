import { useUser } from '@clerk/clerk-react';
import { useProUser } from './useProUser';
import { getFeatureFlags, type FeatureFlags } from '../lib/featureFlags';

const OWNER_ID = 'user_3CBInTW2eAXEABQpFJ7czG6U2kp';

const ALL_FLAGS_ON: FeatureFlags = {
  canViewConflictAlerts: true,
  canUseWatchlists: true,
  canReceiveAlerts: true,
  canUseImpactAnalysis: true,
  canUseSemanticSearch: true,
  canUseHearingSuperSearch: true,
  canViewSentiment: true,
  canViewLobbyingData: true,
  canExportData: true,
  canCreateActionKits: true,
  canAccessAPI: true,
  canUseSmsAlerts: true,
  canUseSlackAlerts: true,
};

export function useFeatureFlags(): FeatureFlags {
  const { user } = useUser();
  const { tier } = useProUser();

  if (user?.id === OWNER_ID) return ALL_FLAGS_ON;

  return getFeatureFlags(tier);
}
