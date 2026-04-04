import { CouncilMember, Bill, Hearing, CampaignFinance, MemberMetrics } from '../types';
import type { MemberSummary, HearingRecord, MemberProfile } from '../lib/types';

// Static data caches
let membersCache: CouncilMember[] | null = null;
let billsCache: Bill[] | null = null;
let hearingsCache: Hearing[] | null = null;
const financeCache = new Map<string, CampaignFinance | null>();
let memberMetricsCache: MemberMetrics[] | null = null;
const memberProfileCache = new Map<string, MemberProfile | null>();

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
    neighborhoods: member.neighborhoods || [],
    committees: [],
    contact: {
      email: slug ? slug.replace(/-/g, '') + '@council.nyc.gov' : '',
      phone: '212-788-7100',
      website: 'https://council.nyc.gov/district-' + member.districtNumber + '/',
    },
    photoUrl: `https://raw.githubusercontent.com/NewYorkCityCouncil/districts/master/thumbnails/district-${member.districtNumber}.jpg`,
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Response from ${url} is not JSON`);
  }
  return response.json();
}

export async function fetchMembers(): Promise<CouncilMember[]> {
  if (membersCache) return membersCache;

  try {
    const members = await fetchJson<MemberSummary[]>('/data/members-index.json');
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
    const bills = await fetchJson<BillIndexRecord[]>('/data/bills-index.json');
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
    const hearings = await fetchJson<HearingRecord[]>('/data/hearings-upcoming.json');
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
    const finance = await fetchJson<CampaignFinance>('/data/finance/' + memberId + '.json');
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
    const metrics = await fetchJson<MemberMetrics[]>('/data/member-metrics.json');
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

export async function getDistrictFromBBL(bbl: string) {
  try {
    const response = await fetch(`https://data.cityofnewyork.us/resource/64uk-42ks.json?bbl=${bbl}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0 && data[0].council) {
      return parseInt(data[0].council, 10);
    }
  } catch (error) {
    console.error('Error fetching district from BBL:', error);
  }
  return null;
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

export async function fetchMemberProfile(id: string): Promise<MemberProfile | null> {
  if (memberProfileCache.has(id)) {
    return memberProfileCache.get(id) ?? null;
  }

  try {
    const profile = await fetchJson<MemberProfile>('/data/members/' + id + '.json');
    memberProfileCache.set(id, profile);
    return profile;
  } catch (error) {
    console.error('Error loading member profile:', error);
    memberProfileCache.set(id, null);
    return null;
  }
}
