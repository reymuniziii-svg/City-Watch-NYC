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
  totalRaised: number;
  publicFunds: number;
  smallDollarShare: number;
  topDonors: { name: string; amount: number }[];
  donorPatterns: { category: string; amount: number }[];
}
