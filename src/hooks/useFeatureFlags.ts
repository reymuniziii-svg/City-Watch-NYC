import { useProUser } from './useProUser';
import { getFeatureFlags, type FeatureFlags } from '../lib/featureFlags';

export function useFeatureFlags(): FeatureFlags {
  const { tier } = useProUser();
  return getFeatureFlags(tier);
}
