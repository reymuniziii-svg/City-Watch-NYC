import { useState, useCallback } from 'react';
import { searchAddress, getDistrictFromBBL } from '../services/nycDataService';

export interface CMInfo {
  district: number;
  memberSlug: string | null;
  fullName: string;
  email: string;
  address: string;
}

const STORAGE_KEY = 'nyc_civic_cm_info';

function loadFromStorage(): CMInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return null;
}

function saveToStorage(info: CMInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

function makeEmail(slug: string | null): string {
  if (!slug) return '';
  return slug.replace(/-/g, '') + '@council.nyc.gov';
}

export function useMyCM() {
  const [cmInfo, setCmInfo] = useState<CMInfo | null>(() => loadFromStorage());
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const inlineResolve = useCallback(async (address: string): Promise<CMInfo | null> => {
    setIsResolving(true);
    setResolveError(null);
    try {
      const results = await searchAddress(address);
      if (!results || results.length === 0) {
        setResolveError("No address found. Please try a more specific NYC address.");
        return null;
      }
      const first = results[0];
      const bbl = first.properties?.addendum?.pad?.bbl;
      if (!bbl) {
        setResolveError("Couldn't find a Borough-Block-Lot for this address.");
        return null;
      }
      const district = await getDistrictFromBBL(bbl);
      if (!district) {
        setResolveError("Couldn't find a City Council district for this address. Make sure it's in NYC.");
        return null;
      }

      const membersResp = await fetch('/data/members-index.json');
      const members: Array<{
        slug: string | null;
        fullName: string;
        districtNumber: number;
        status: string;
      }> = await membersResp.json();

      const member = members.find(m => m.districtNumber === district && m.status === 'seated');
      if (!member) {
        setResolveError("No seated council member found for your district.");
        return null;
      }

      const info: CMInfo = {
        district,
        memberSlug: member.slug,
        fullName: member.fullName,
        email: makeEmail(member.slug),
        address: first.properties?.label || address,
      };
      saveToStorage(info);
      setCmInfo(info);
      return info;
    } catch (err) {
      console.error('CM resolution error:', err);
      setResolveError("Something went wrong. Please try again.");
      return null;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const clearCM = useCallback(() => {
    clearStorage();
    setCmInfo(null);
    setResolveError(null);
  }, []);

  return { cmInfo, isResolving, resolveError, inlineResolve, clearCM };
}
