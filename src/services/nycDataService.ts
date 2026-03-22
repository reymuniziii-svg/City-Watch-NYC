import { CouncilMember, Bill, Hearing } from '../types';
import memberSupplemental from '../data/member-supplemental.json';

const GITHUB_BASE = 'https://raw.githubusercontent.com/jehiah/nyc_legislation/master';

export async function fetchMembers(): Promise<CouncilMember[]> {
  try {
    const memberIds = Object.keys(memberSupplemental);
    const memberPromises = memberIds.map(async (id) => {
      try {
        const response = await fetch(`${GITHUB_BASE}/people/${id}.json`);
        if (!response.ok) return null;
        const data = await response.json();
        const supplemental = (memberSupplemental as any)[id];

        let district = 0;
        const districtMatch = data.WWW?.match(/district-(\d+)/i) || supplemental?.photoUrl?.match(/district-(\d+)/i);
        if (districtMatch) {
          district = parseInt(districtMatch[1], 10);
        }

        const committees = (data.OfficeRecords || [])
          .filter((record: any) => record.BodyName && record.BodyName.includes('Committee'))
          .map((record: any) => record.BodyName);

        // Deduplicate committees
        const uniqueCommittees = Array.from(new Set(committees)) as string[];

        const member: CouncilMember = {
          id: id,
          name: data.FullName || data.name,
          district: district,
          party: 'Democrat', // Default as it's not in the JSON
          borough: 'NYC', // Default as it's not in the JSON
          neighborhoods: supplemental?.neighborhoods || [],
          committees: uniqueCommittees,
          contact: {
            email: data.Email || `${id.replace(/-/g, '')}@council.nyc.gov`,
            phone: '212-788-7100', // Default
            website: data.WWW || `https://council.nyc.gov/district-${district}/`,
            twitter: undefined,
            facebook: undefined
          },
          photoUrl: supplemental?.photoUrl,
          sponsoredBillsCount: 0, // Not in this JSON
          enactedBillsCount: 0 // Not in this JSON
        };
        return member;
      } catch (e) {
        console.error(`Error fetching member ${id}:`, e);
        return null;
      }
    });

    const members = await Promise.all(memberPromises);
    const validMembers = members.filter((m): m is CouncilMember => m !== null);
    
    // Deduplicate by district (keep the first one found, which is fine since we filtered active ones)
    const uniqueMembers = Array.from(new Map(validMembers.map(m => [m.district, m])).values());
    
    // Sort by district
    return uniqueMembers.sort((a, b) => a.district - b.district);
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
}

export async function fetchBills(): Promise<Bill[]> {
  try {
    const listResponse = await fetch('https://api.github.com/repos/jehiah/nyc_legislation/contents/introduction/2026');
    if (!listResponse.ok) return [];
    const files = await listResponse.json();
    
    // Fetch first 20 bills to avoid rate limits
    const billFiles = files.filter((f: any) => f.name.endsWith('.json')).slice(0, 20);
    
    const billPromises = billFiles.map(async (file: any) => {
      try {
        const response = await fetch(`${GITHUB_BASE}/introduction/2026/${file.name}`);
        if (!response.ok) return null;
        const data = await response.json();
        return {
          id: data.ID?.toString() || file.name,
          number: data.File,
          title: data.Name,
          summary: data.Summary,
          status: data.StatusName,
          sponsors: data.Sponsors?.map((s: any) => s.FullName) || [],
          introducedDate: data.IntroDate,
          lastActionDate: data.LastModified
        };
      } catch (e) {
        return null;
      }
    });

    const bills = await Promise.all(billPromises);
    return bills.filter((b): b is Bill => b !== null);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return [];
  }
}

export async function fetchHearings(): Promise<Hearing[]> {
  try {
    const listResponse = await fetch('https://api.github.com/repos/jehiah/nyc_legislation/contents/events/2026');
    if (!listResponse.ok) return [];
    const files = await listResponse.json();
    
    // Fetch first 10 hearings
    const hearingFiles = files.filter((f: any) => f.name.endsWith('.json')).slice(0, 10);
    
    const hearingPromises = hearingFiles.map(async (file: any) => {
      try {
        const response = await fetch(`${GITHUB_BASE}/events/2026/${file.name}`);
        if (!response.ok) return null;
        const data = await response.json();
        return {
          id: data.ID?.toString() || file.name,
          title: data.BodyName || 'City Council Hearing',
          date: data.Date?.split('T')[0] || data.Date,
          time: data.Date?.split('T')[1]?.substring(0, 5) || 'TBD',
          location: data.Location || 'City Hall',
          committee: data.BodyName,
          bills: data.Items?.map((i: any) => i.Title).filter(Boolean) || []
        };
      } catch (e) {
        return null;
      }
    });

    const hearings = await Promise.all(hearingPromises);
    return hearings.filter((h): h is Hearing => h !== null);
  } catch (error) {
    console.error('Error fetching hearings:', error);
    return [];
  }
}

export async function searchAddress(query: string) {
  const response = await fetch(`https://geosearch.planninglabs.nyc/v2/autocomplete?text=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.features || [];
}

export async function getDistrictFromCoords(lat: number, lng: number) {
  try {
    const url = `https://data.cityofnewyork.us/resource/872g-cjhh.json?$where=intersects(the_geom, 'POINT(${lng} ${lat})')`;
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
