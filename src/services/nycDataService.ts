import { CouncilMember, Bill, Hearing, CampaignFinance, MemberMetrics } from '../types';
import type { MemberSummary, HearingRecord } from '../lib/types';

// Static data caches
let membersCache: CouncilMember[] | null = null;
let billsCache: Bill[] | null = null;
let hearingsCache: Hearing[] | null = null;
const financeCache = new Map<string, CampaignFinance | null>();
let memberMetricsCache: MemberMetrics[] | null = null;

interface BillIndexRecord {
  billId: string;
  introNumber: string;
  title: string;
  summary: string;
  statusName: string;
  introDate: string;
  actionDate: string;
  leadSponsorSlug: string | null;
  sponsorCount: number;
}

function mapMemberToCouncilMember(member: MemberSummary): CouncilMember {
  const slug = member.slug || '';
  return {
    id: slug || 'district-' + member.districtNumber,
    name: member.fullName,
    district: member.districtNumber,
    party: member.party,
    borough: 'NYC',
    neighborhoods: [],
    committees: [],
    contact: {
      email: slug ? slug.replace(/-/g, '') + '@council.nyc.gov' : '',
      phone: '212-788-7100',
      website: 'https://council.nyc.gov/district-' + member.districtNumber + '/',
    },
    sponsoredBillsCount: member.billsSponsored,
    enactedBillsCount: member.billsEnacted,
  };
}

function mapBillToBill(bill: BillIndexRecord): Bill {
  return {
    id: bill.billId,
    number: bill.introNumber,
    introNumber: bill.introNumber,
    title: bill.title,
    summary: bill.summary,
    status: bill.statusName,
    sponsors: [],
    introducedDate: bill.introDate,
    lastActionDate: bill.actionDate,
    statusBucket: (bill as BillIndexRecord & { statusBucket?: string }).statusBucket,
    committee: (bill as BillIndexRecord & { committee?: string }).committee,
    sponsorCount: bill.sponsorCount,
    leadSponsorSlug: bill.leadSponsorSlug,
    route: (bill as BillIndexRecord & { route?: string }).route,
    session: (bill as BillIndexRecord & { session?: number }).session,
  };
}

function mapHearingToHearing(hearing: HearingRecord): Hearing {
  const dateObj = new Date(hearing.date);
  return {
    id: hearing.eventId.toString(),
    title: hearing.bodyName,
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toTimeString().substring(0, 5),
    location: hearing.location,
    committee: hearing.bodyName,
    bills: hearing.agendaItems.map(item => item.title),
  };
}

export async function fetchMembers(): Promise<CouncilMember[]> {
  if (membersCache) return membersCache;

  try {
    const response = await fetch('/data/members-index.json');
    if (!response.ok) {
      console.error('Failed to load members-index.json');
      return [];
    }
    const members: MemberSummary[] = await response.json();
    membersCache = members
      .filter(m => m.status === 'seated')
      .map(mapMemberToCouncilMember)
      .sort((a, b) => a.district - b.district);
    return membersCache;
  } catch (error) {
    console.error('Error loading members:', error);
    return [];
  }
}

export async function fetchBills(): Promise<Bill[]> {
  if (billsCache) return billsCache;

  try {
    const response = await fetch('/data/bills-index.json');
    if (!response.ok) {
      console.error('Failed to load bills-index.json');
      return [];
    }
    const bills: BillIndexRecord[] = await response.json();
    billsCache = bills.map(mapBillToBill);
    return billsCache;
  } catch (error) {
    console.error('Error loading bills:', error);
    return [];
  }
}

export async function fetchHearings(): Promise<Hearing[]> {
  if (hearingsCache) return hearingsCache;

  try {
    const response = await fetch('/data/hearings-upcoming.json');
    if (!response.ok) {
      console.error('Failed to load hearings-upcoming.json');
      return [];
    }
    const hearings: HearingRecord[] = await response.json();
    hearingsCache = hearings.map(mapHearingToHearing);
    return hearingsCache;
  } catch (error) {
    console.error('Error loading hearings:', error);
    return [];
  }
}

export async function getCampaignFinance(memberId: string): Promise<CampaignFinance | null> {
  if (financeCache.has(memberId)) {
    return financeCache.get(memberId) ?? null;
  }

  try {
    const response = await fetch('/data/finance/' + memberId + '.json');
    if (!response.ok) {
      financeCache.set(memberId, null);
      return null;
    }

    const finance: CampaignFinance = await response.json();
    financeCache.set(memberId, finance);
    return finance;
  } catch (error) {
    console.error('Error loading campaign finance:', error);
    financeCache.set(memberId, null);
    return null;
  }
}

export async function fetchMemberMetrics(): Promise<MemberMetrics[]> {
  if (memberMetricsCache) return memberMetricsCache;

  try {
    const response = await fetch('/data/member-metrics.json');
    if (!response.ok) {
      console.error('Failed to load member-metrics.json');
      return [];
    }

    const metrics: MemberMetrics[] = await response.json();
    memberMetricsCache = metrics;
    return memberMetricsCache;
  } catch (error) {
    console.error('Error loading member metrics:', error);
    return [];
  }
}

export async function getMemberMetrics(memberId: string): Promise<MemberMetrics | null> {
  const metrics = await fetchMemberMetrics();
  return metrics.find((entry) => entry.slug === memberId) ?? null;
}

export async function searchAddress(query: string) {
  const response = await fetch('https://geosearch.planninglabs.nyc/v2/autocomplete?text=' + encodeURIComponent(query));
  const data = await response.json();
  return data.features || [];
}

export async function getDistrictFromCoords(lat: number, lng: number) {
  try {
    const url = 'https://data.cityofnewyork.us/resource/872g-cjhh.json?$where=intersects(the_geom, \'POINT(' + lng + ' ' + lat + ')\')';
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      return parseInt(data[0].coundist, 10);
    }
  } catch (error) {
    console.error('Error fetching district from coords:', error);
  }
  return null;
}
