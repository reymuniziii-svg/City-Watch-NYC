const STATUS_BUCKETS: Array<{ pattern: RegExp; bucket: string }> = [
  { pattern: /Introduced/i, bucket: "Introduced" },
  { pattern: /Referred|Committee/i, bucket: "Committee" },
  { pattern: /Hearing Held/i, bucket: "Hearing Held" },
  { pattern: /Amend/i, bucket: "Amended" },
  { pattern: /Approved by Committee|Committee Vote/i, bucket: "Voted (Committee)" },
  { pattern: /Approved by Council|Adopted|Passed/i, bucket: "Voted (Full Council)" },
  { pattern: /Enacted|Signed|Law/i, bucket: "Enacted" },
  { pattern: /Veto/i, bucket: "Vetoed" },
  { pattern: /Filed|Withdrawn|Failed/i, bucket: "Failed" },
];

export function mapStatusBucket(statusName: string): string {
  for (const candidate of STATUS_BUCKETS) {
    if (candidate.pattern.test(statusName)) {
      return candidate.bucket;
    }
  }

  return "Introduced";
}

export function normalizeDate(value: string): string {
  if (!value || value.startsWith("0001-01-01")) {
    return "";
  }

  return value;
}

export function isEnactedStatus(statusName: string): boolean {
  return /Enacted|Mayor/i.test(statusName);
}
