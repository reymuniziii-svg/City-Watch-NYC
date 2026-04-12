import type { ProTier } from '../hooks/useProUser';

export interface FeatureFlags {
  canViewConflictAlerts: boolean;
  canUseWatchlists: boolean;
  canReceiveAlerts: boolean;
  canUseImpactAnalysis: boolean;
  canUseSemanticSearch: boolean;
  canUseHearingSuperSearch: boolean;
  canViewSentiment: boolean;
  canExportData: boolean;
  canCreateActionKits: boolean;
  canAccessAPI: boolean;
  canViewLobbyingData: boolean;
  canUseSmsAlerts: boolean;
  canUseSlackAlerts: boolean;
  canViewWorkHorse: boolean;
  canBenchmarkMembers: boolean;
  canViewCommitteeHeatmap: boolean;
  canViewBillProximity: boolean;
  canViewStakeholderMaps: boolean;
  canUseStafferDirectory: boolean;
  canUseInstitutionalMemory: boolean;
  canUseMondayBrief: boolean;
  canUseSemanticAnalysis: boolean;
  canUsePredictiveSchedule: boolean;
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
    canUseHearingSuperSearch: isPro,
    canViewSentiment: isPro,
    canViewLobbyingData: isPro,
    canExportData: isEnterprise,
    canCreateActionKits: isEnterprise,
    canAccessAPI: isEnterprise,
    canUseSmsAlerts: isEnterprise,
    canUseSlackAlerts: isEnterprise,
    canViewWorkHorse: isPro,
    canBenchmarkMembers: isPro,
    canViewCommitteeHeatmap: isPro,
    canViewBillProximity: isPro,
    canViewStakeholderMaps: isPro,
    canUseStafferDirectory: isEnterprise,
    canUseInstitutionalMemory: isEnterprise,
    canUseMondayBrief: isEnterprise,
    canUseSemanticAnalysis: isEnterprise,
    canUsePredictiveSchedule: isEnterprise,
  };
}
