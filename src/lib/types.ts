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
}

export interface SearchDocument {
  id: string;
  type: "member" | "bill" | "hearing";
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
