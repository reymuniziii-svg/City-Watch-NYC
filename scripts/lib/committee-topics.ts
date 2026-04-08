// Maps committee names to industry sectors matching classifyIndustry() output labels
export const COMMITTEE_INDUSTRY_MAP: Record<string, string[]> = {
  'Housing and Buildings': ['Real Estate'],
  'Finance': ['Finance'],
  'Transportation and Infrastructure': ['Real Estate'],
  'Health': ['Healthcare'],
  'Education': ['Education'],
  'Small Business': ['Small Business / Retail'],
  'Civil Service and Labor': ['Labor'],
  'Land Use': ['Real Estate'],
  'Hospitals': ['Healthcare'],
  'Mental Health, Disabilities and Addiction': ['Healthcare'],
  'Environmental Protection, Resiliency and Waterfronts': ['Real Estate'],
  'Consumer and Worker Protection': ['Labor'],
  'Economic Development': ['Finance', 'Real Estate'],
  'General Welfare': ['Nonprofit / Advocacy'],
  'Governmental Operations': ['Government / Public Sector'],
  'Public Safety': ['Government / Public Sector'],
};

export function getIndustriesForCommittee(committeeName: string): string[] {
  // Try exact match first
  if (COMMITTEE_INDUSTRY_MAP[committeeName]) {
    return COMMITTEE_INDUSTRY_MAP[committeeName];
  }
  // Try partial match
  for (const [key, industries] of Object.entries(COMMITTEE_INDUSTRY_MAP)) {
    if (committeeName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(committeeName.toLowerCase())) {
      return industries;
    }
  }
  return [];
}
