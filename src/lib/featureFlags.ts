import type { ProTier } from '../hooks/useProUser';

export interface FeatureFlags {
  canViewConflictAlerts: boolean;
  canUseWatchlists: boolean;
  canReceiveAlerts: boolean;
  canUseImpactAnalysis: boolean;
  canUseSemanticSearch: boolean;
  canCreateActionKits: boolean;
  canAccessAPI: boolean;
}

export function getFeatureFlags(tier: ProTier): FeatureFlags {
  return {
    canViewConflictAlerts: tier === 'advocate' || tier === 'enterprise',
    canUseWatchlists: tier === 'advocate' || tier === 'enterprise',
    canReceiveAlerts: tier === 'advocate' || tier === 'enterprise',
    canUseImpactAnalysis: tier === 'advocate' || tier === 'enterprise',
    canUseSemanticSearch: tier === 'advocate' || tier === 'enterprise',
    canCreateActionKits: tier === 'enterprise',
    canAccessAPI: tier === 'enterprise',
  };
}
