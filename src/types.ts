export interface CouncilMember {
  id: string;
  name: string;
  district: number;
  party: string;
  borough: string;
  neighborhoods: string[];
  committees: string[];
  contact: {
    email: string;
    phone: string;
    website: string;
    twitter?: string;
    facebook?: string;
  };
  photoUrl?: string;
  sponsoredBillsCount?: number;
  enactedBillsCount?: number;
}

export interface Bill {
  id: string;
  number: string;
  title: string;
  summary: string;
  status: string;
  sponsors: string[];
  introducedDate: string;
  lastActionDate: string;
  introNumber?: string;
  session?: number;
  statusBucket?: string;
  committee?: string;
  sponsorCount?: number;
  leadSponsorSlug?: string | null;
  route?: string;
  plainEnglishSummary?: {
    whatItDoes: string;
    whoItAffects: string;
    whyItMatters: string;
    whatHappensNext: string;
  };
}

export interface Hearing {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  committee: string;
  bills: string[];
  summary?: {
    whatHappened: string;
    takeaways: string[];
    actionType: string;
    keyQuotes: string[];
  };
}

export interface CampaignFinance {
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
  topDonors: {
    name: string;
    amount: number;
    donorType: string;
    city: string;
    state: string;
    occupation: string;
    employer: string;
  }[];
  topIndustries: {
    label: string;
    amount: number;
    contributorCount: number;
  }[];
  donorsByIndustry: Record<string, {
    name: string;
    amount: number;
    donorType: string;
    city: string;
    state: string;
    occupation: string;
    employer: string;
  }[]>;
  grassrootsScore: number | null;
  grassrootsGrade: string | null;
  explanatoryNotes: string[];
  expenditures: {
    totalSpent: number;
    byCategory: { label: string; amount: number }[];
    topPayees: { name: string; amount: number; category: string }[];
  } | null;
}

export interface FinanceIndexRow {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  borough: string;
  totalRaised: number | null;
  publicFundsShare: number | null;
  smallDollarShare: number | null;
  topTenDonorShare: number | null;
  contributorCount: number;
  avgContribution: number | null;
  outsideCityShare: number | null;
  organizationalDonorShare: number | null;
  hasRealEstateFlag: boolean;
  topIndustries: {
    label: string;
    amount: number;
    contributorCount: number;
  }[];
}

export interface MemberMetrics {
  slug: string;
  billsSponsored: number;
  billsEnacted: number;
  coSponsorshipRate: number;
  hearingActivity: number;
  rankSponsored: number;
  rankEnacted: number;
}
