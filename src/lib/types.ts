export interface SourceContextField {
  label: string;
  value: string;
}

export interface SourceContext {
  inputFields: SourceContextField[];
  sourceLabel: string;
  sourceUrl?: string;
  generatedAt: string;
  model: string;
}

export type OccupancyStatus = "seated" | "vacant";

export interface DistrictRecord {
  districtNumber: number;
  memberSlug: string | null;
  occupancyStatus: OccupancyStatus;
  memberName: string | null;
}

export interface CommitteeAssignment {
  bodyId: number;
  bodyName: string;
  title: string;
  isChair: boolean;
  start: string;
  end: string;
}

export interface MemberContact {
  email: string;
  website: string;
  districtOffice: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  legislativeOffice: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
}

export interface MemberSupplemental {
  slug: string;
  districtNumber: number;
  party: string;
  neighborhoods: string[];
  photoUrl: string;
  socials: {
    x?: string;
    instagram?: string;
    facebook?: string;
  };
  phone?: string;
}

export interface MemberSummary {
  slug: string | null;
  fullName: string;
  districtNumber: number;
  party: string;
  neighborhoods: string[];
  billsSponsored: number;
  billsEnacted: number;
  rankSponsored: number;
  rankEnacted: number;
  status: OccupancyStatus;
}

export interface BillTimelineStep {
  label: string;
  date: string;
  bodyName: string;
  action: string;
}

export interface BillSponsor {
  slug: string;
  fullName: string;
}

export interface BillExplainer {
  whatItDoes: string;
  whoItAffects: string;
  whyItMatters: string;
  whatHappensNext: string;
  sourceContext?: SourceContext;
}

export interface BillRecord {
  billId: string;
  session: number;
  number: string;
  typeName: string;
  introNumber: string;
  title: string;
  summary: string;
  summaryShort: string;
  summarySource: "ai" | "fallback";
  explainer: BillExplainer | null;
  statusName: string;
  statusBucket: string;
  committee: string;
  introDate: string;
  actionDate: string;
  passedDate: string | null;
  enactmentDate: string | null;
  sponsorCount: number;
  sponsors: BillSponsor[];
  leadSponsorSlug: string | null;
  timeline: BillTimelineStep[];
  legistarUrl: string;
  transcriptUrl: string | null;
  updatedAt: string;
}

export interface HearingAgendaItem {
  matterFile: string;
  billSession: number | null;
  billNumber: string | null;
  billRoute: string | null;
  title: string;
}

export interface HearingRecord {
  eventId: number;
  bodyName: string;
  bodySlug: string;
  date: string;
  location: string;
  videoUrl: string | null;
  legistarUrl: string | null;
  testimonyUrl: string | null;
  agendaItems: HearingAgendaItem[];
}

export interface HearingQuote {
  speaker: string;
  quote: string;
  chapterTitle: string;
  chapterUrl: string;
}

export interface HearingSummary {
  id: string;
  eventDate: string;
  bodyName: string;
  title: string;
  cityMeetingsUrl: string;
  sourceLabel: string;
  overview: string;
  takeaways: string[];
  quotes: HearingQuote[];
  discussedBills: HearingAgendaItem[];
  outcomeType: "action" | "oversight" | "testimony" | "mixed" | "unknown";
  matchedBy: "body-and-date";
  sourceContext?: SourceContext;
}

export interface VoteRecord {
  billId: string;
  introNumber: string;
  title: string;
  vote: "Aye" | "Nay" | "Abstain" | "Not Voting";
  outcome: "Passed" | "Failed" | "Unknown";
  date: string;
}

export interface MemberScorecard {
  billsSponsored: number;
  billsSponsoredRank: number;
  billsEnacted: number;
  billsEnactedRank: number;
  coSponsorshipRate: number;
  hearingActivity: number;
}

export interface FinanceTopDonor {
  name: string;
  amount: number;
  donorType: string;
  city: string;
  state: string;
  occupation: string;
  employer: string;
}

export interface FinanceIndustryBreakdown {
  label: string;
  amount: number;
  contributorCount: number;
}

export interface ExpenditureCategory {
  label: string;
  amount: number;
}

export interface ExpenditureTopPayee {
  name: string;
  amount: number;
  category: string;
}

export interface ExpenditureProfile {
  totalSpent: number;
  byCategory: ExpenditureCategory[];
  topPayees: ExpenditureTopPayee[];
}

export interface MemberFinanceProfile {
  slug: string;
  cycle: string;
  candidateName: string | null;
  candidateId: string | null;
  sourceUrl: string;
  updatedAt: string;
  contributorCount: number;
  totalRaised: number | null;
  publicFunds: number | null;
  publicFundsShare: number | null;
  smallDollarAmount: number | null;
  smallDollarDonorCount: number | null;
  smallDollarShare: number | null;
  topTenDonorShare: number | null;
  maxContributionDonorCount: number | null;
  maxContributionAmount: number | null;
  organizationalDonorAmount: number | null;
  organizationalDonorShare: number | null;
  outsideCityAmount: number | null;
  outsideCityShare: number | null;
  topDonors: FinanceTopDonor[];
  topIndustries: FinanceIndustryBreakdown[];
  donorsByIndustry: Record<string, FinanceTopDonor[]>;
  grassrootsScore: number | null;
  grassrootsGrade: string | null;
  explanatoryNotes: string[];
  expenditures: ExpenditureProfile | null;
}

export interface MemberProfile {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  neighborhoods: string[];
  photoUrl: string;
  officialUrl: string;
  contact: MemberContact;
  socials: {
    x?: string;
    instagram?: string;
    facebook?: string;
  };
  committees: CommitteeAssignment[];
  scorecard: MemberScorecard;
  bills: BillRecord[];
  upcomingHearings: HearingRecord[];
  hearingSummaries: HearingSummary[];
  recentVotes: VoteRecord[];
  enactedFallback: BillRecord[];
  finance: MemberFinanceProfile | null;
  lobbying: MemberLobbyingProfile | null;
  workHorse: WorkHorseScore | null;
}

export interface SearchDocument {
  id: string;
  type: "member" | "bill" | "hearing" | "lobbying";
  label: string;
  subtitle: string;
  route: string;
  introNumber?: string;
  billTitle?: string;
  memberName?: string;
  hearingTitle?: string;
  hearingDate?: string;
  committeeName?: string;
  searchText?: string;
}

export interface SummaryCacheEntry {
  key: string;
  billId: string;
  statusName: string;
  titleHash: string;
  summary: string;
  explainer: BillExplainer;
  sourceContext?: SourceContext;
  updatedAt: string;
}

export interface SummaryCacheFile {
  generatedAt: string;
  provider?: string;
  model?: string;
  cacheNamespace?: string;
  entries: SummaryCacheEntry[];
}

export interface ExportCardPayload {
  type: "bill" | "hearing" | "money";
  title: string;
  subtitle: string;
  points: string[];
  footer: string;
}

export interface InfluenceMapEntry {
  memberSlug: string;
  memberName: string;
  districtNumber: number;
  donorName: string;
  donorIndustry: string;
  totalAmount: number;
  relatedBills: {
    introNumber: string;
    title: string;
    committee: string;
    introDate: string;
  }[];
  lobbyingConnections?: LobbyingConnection[];
}

export interface ConflictAlert {
  memberSlug: string;
  memberName: string;
  donorName: string;
  donorIndustry: string;
  donationAmount: number;
  donationDate: string;
  billIntroNumber: string;
  billTitle: string;
  billIntroDate: string;
  daysDelta: number;
  lobbyingActivity?: {
    lobbyistName: string;
    clientName: string;
    clientIndustry: string;
    totalSpending: number;
    period: string;
    reportYear: number;
  };
}

export type LobbyingPosition = "for" | "against" | "unknown";

export interface LobbyingClient {
  clientName: string;
  clientIndustry: string;
  lobbyistName: string;
  position: LobbyingPosition;
  totalSpending: number;
  reportCount: number;
  latestReportDate: string;
}

export interface LobbyingIndustryBreakdown {
  industry: string;
  totalSpending: number;
  clientCount: number;
  positions: { for: number; against: number; unknown: number; };
}

export interface BillLobbyingProfile {
  introNumber: string;
  billTitle: string;
  updatedAt: string;
  totalLobbyingSpending: number;
  clientCount: number;
  firmCount: number;
  topClients: LobbyingClient[];
  industryBreakdown: LobbyingIndustryBreakdown[];
  topFirms: {
    lobbyistName: string;
    clientCount: number;
    totalSpending: number;
  }[];
}

export interface MemberLobbyingProfile {
  memberSlug: string;
  memberName: string;
  updatedAt: string;
  totalLobbyingSpending: number;
  uniqueClients: number;
  uniqueFirms: number;
  topClients: {
    clientName: string;
    clientIndustry: string;
    lobbyistName: string;
    totalSpending: number;
    reportCount: number;
    subjects: string[];
    relatedBills: { introNumber: string; title: string; position: LobbyingPosition; }[];
  }[];
  topIndustries: { industry: string; totalSpending: number; clientCount: number; }[];
  recentFilings: {
    lobbyistName: string;
    clientName: string;
    period: string;
    reportYear: number;
    compensationTotal: number;
    endDate: string;
  }[];
}

export interface LobbyingIndexEntry {
  clientName: string;
  clientIndustry: string;
  totalSpending: number;
  lobbyistNames: string[];
  targetedMemberCount: number;
  targetedBillCount: number;
  latestReportYear: number;
  latestPeriod: string;
}

export interface LobbyingConnection {
  lobbyistName: string;
  clientName: string;
  clientIndustry: string;
  totalSpending: number;
  overlappingBills: string[];
}

/* ------------------------------------------------------------------ */
/*  Work Horse Effectiveness Index                                    */
/* ------------------------------------------------------------------ */

export interface WorkHorseScore {
  successRate: number;
  committeePullRate: number;
  bipartisanReachRate: number;
  velocityScore: number;
  compositeScore: number;
  rank: number;
  billBreakdown: {
    introduced: number;
    passedCommittee: number;
    enacted: number;
    bipartisanBills: number;
  };
}

export interface WorkHorseEntry {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  successRate: number;
  committeePullRate: number;
  bipartisanReachRate: number;
  velocityScore: number;
  compositeScore: number;
  rank: number;
  billBreakdown: {
    introduced: number;
    passedCommittee: number;
    enacted: number;
    bipartisanBills: number;
  };
}

export interface BillVelocityPoint {
  date: string;
  count: number;
}

export interface BillVelocityEntry {
  introNumber: string;
  title: string;
  leadSponsorSlug: string;
  committee: string;
  introDate: string;
  sponsorTimeline: BillVelocityPoint[];
  committeeMean: BillVelocityPoint[];
  daysToCommittee: number | null;
}

/* ------------------------------------------------------------------ */
/*  Committee Industry Heatmap                                        */
/* ------------------------------------------------------------------ */

export interface CommitteeIndustryCell {
  industry: string;
  totalAmount: number;
  donorCount: number;
  memberCount: number;
  topMembers: { slug: string; name: string; amount: number }[];
}

export interface CommitteeHeatmapEntry {
  committee: string;
  industries: CommitteeIndustryCell[];
  totalFunding: number;
  memberCount: number;
}

/* ------------------------------------------------------------------ */
/*  Bill Donor Proximity                                              */
/* ------------------------------------------------------------------ */

export interface BillDonorProximity {
  introNumber: string;
  title: string;
  committee: string;
  topDonors: {
    donorName: string;
    industry: string;
    totalToSponsors: number;
    sponsorSlugs: string[];
  }[];
}

/* ------------------------------------------------------------------ */
/*  Staffer Directory                                                 */
/* ------------------------------------------------------------------ */

export interface StafferRecord {
  id: string;
  districtNumber: number;
  memberSlug: string | null;
  fullName: string;
  title: string;
  email: string | null;
  phone: string | null;
  policyAreas: string[];
  verified: boolean;
}

export interface CommunicationLogEntry {
  id: string;
  stafferId: string;
  userId: string;
  userName: string;
  contactType: "email" | "call" | "meeting" | "other";
  summary: string;
  contactDate: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Institutional Memory                                              */
/* ------------------------------------------------------------------ */

export interface MemberNote {
  id: string;
  memberSlug: string;
  userId: string;
  userName: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVaultEntry {
  id: string;
  entityType: "bill" | "member" | "hearing";
  entityId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  description: string;
  uploadedBy: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Monday Morning Brief                                              */
/* ------------------------------------------------------------------ */

export interface BriefPreferences {
  enabled: boolean;
  dayOfWeek: number;
  includeWatchlist: boolean;
  includeConflicts: boolean;
  includeWorkHorse: boolean;
  brandingOrgName: string | null;
  brandingLogoUrl: string | null;
  lastGeneratedAt: string | null;
}
