import type { ProTier } from '../hooks/useProUser';

export interface FeatureFlags {
  canViewConflictAlerts: boolean;
  canUseWatchlists: boolean;
  canReceiveAlerts: boolean;
  canUseImpactAnalysis: boolean;
  canUseSemanticSearch: boolean;
  canCreateActionKits: boolean;
  canAccessAPI: boolean;
  // Phase 1
  canViewWorkHorse: boolean;
  canBenchmarkMembers: boolean;
  // Phase 2
  canViewCommitteeHeatmap: boolean;
  canViewBillProximity: boolean;
  // Phase 3
  canViewStakeholderMaps: boolean;
  // Phase 5
  canUseStafferDirectory: boolean;
  // Phase 6
  canUseInstitutionalMemory: boolean;
  // Phase 7
  canUseSemanticAnalysis: boolean;
  canUsePredictiveSchedule: boolean;
  // Phase 8
  canUseMondayBrief: boolean;
}

export function getFeatureFlags(tier: ProTier): FeatureFlags {
  const isPro = tier === 'advocate' || tier === 'enterprise';
  const isEnterprise = tier === 'enterprise';

  return {
    canViewConflictAlerts: isPro,
    canUseWatchlists: isPro,
    canReceiveAlerts: isPro,
    canUseImpactAnalysis: isPro,
    canUseSemanticSearch: isPro,
    canCreateActionKits: isEnterprise,
    canAccessAPI: isEnterprise,
    // Phase 1
    canViewWorkHorse: isPro,
    canBenchmarkMembers: isPro,
    // Phase 2
    canViewCommitteeHeatmap: isPro,
    canViewBillProximity: isPro,
    // Phase 3
    canViewStakeholderMaps: isPro,
    // Phase 5
    canUseStafferDirectory: isEnterprise,
    // Phase 6
    canUseInstitutionalMemory: isEnterprise,
    // Phase 7
    canUseSemanticAnalysis: isEnterprise,
    canUsePredictiveSchedule: isEnterprise,
    // Phase 8
    canUseMondayBrief: isEnterprise,
  };
}
