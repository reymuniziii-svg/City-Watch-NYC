import { mapStatusBucket, normalizeDate } from "../../src/lib/status-timeline";
import type { BillRecord, BillTimelineStep, CommitteeAssignment, HearingAgendaItem } from "../../src/lib/types";

export interface RawBill {
  ID: number;
  GUID: string;
  File: string;
  Name: string;
  Title: string;
  TypeName: string;
  StatusName: string;
  IntroDate: string;
  PassedDate: string;
  EnactmentDate: string;
  BodyName: string;
  LastModified: string;
  InSiteURL?: string;
  Sponsors?: Array<{
    Slug?: string;
    FullName?: string;
  }>;
  History?: Array<{
    Date: string;
    Action: string;
    BodyName?: string;
    EventID?: number;
  }>;
}

export interface RawPerson {
  Slug: string;
  IsActive: boolean;
  FullName: string;
  Email?: string;
  WWW?: string;
  Start?: string;
  End?: string;
  DistrictOffice?: {
    Address?: string;
    City?: string;
    State?: string;
    Zip?: string;
  };
  LegislativeOffice?: {
    Address?: string;
    City?: string;
    State?: string;
    Zip?: string;
  };
  OfficeRecords?: Array<{
    BodyID: number;
    BodyName: string;
    Title: string;
    Start: string;
    End: string;
  }>;
}

export interface RawEvent {
  ID: number;
  BodyName: string;
  Date: string;
  Location: string;
  VideoPath?: string;
  InSiteURL?: string;
  Items?: RawEventItem[];
}

export interface RawEventItem {
  Title?: string;
  MatterFile?: string;
  RollCallFlag?: number;
  RollCall?: Array<{
    Slug?: string;
    Value?: string;
  }>;
}

export function parseIntroFile(rawFile: string): { billId: string; session: number; number: string; introNumber: string } | null {
  const match = rawFile.match(/^(Int|Res|LU|M)\s+(\d+)-(\d{4})$/i);
  if (!match) {
    return null;
  }

  const [, type, number, session] = match;
  return {
    billId: `${type.toUpperCase()} ${number.padStart(4, "0")}-${session}`,
    session: Number.parseInt(session, 10),
    number: number.padStart(4, "0"),
    introNumber: `${type.toUpperCase()} ${number.padStart(4, "0")}-${session}`,
  };
}

export function parseMatterFile(matterFile: string): HearingAgendaItem {
  const parsed = parseIntroFile(matterFile);

  if (!parsed) {
    return {
      matterFile,
      billSession: null,
      billNumber: null,
      billRoute: null,
      title: matterFile,
    };
  }

  return {
    matterFile,
    billSession: parsed.session,
    billNumber: parsed.number,
    billRoute: `/bill/${parsed.session}/${parsed.number}`,
    title: parsed.introNumber,
  };
}

export function toTimeline(history: RawBill["History"]): BillTimelineStep[] {
  if (!history || history.length === 0) {
    return [];
  }

  return history
    .map((entry) => ({
      label: mapStatusBucket(entry.Action),
      date: normalizeDate(entry.Date),
      bodyName: entry.BodyName ?? "",
      action: entry.Action,
    }))
    .filter((entry) => Boolean(entry.date));
}

export function toBillRecord(raw: RawBill, summary: string, summarySource: "ai" | "fallback"): BillRecord | null {
  const parsed = parseIntroFile(raw.File);
  if (!parsed) {
    return null;
  }

  const sponsors = (raw.Sponsors ?? []).map((sponsor) => ({
    slug: sponsor.Slug ?? "",
    fullName: sponsor.FullName ?? "Unknown",
  }));

  return {
    billId: parsed.billId,
    session: parsed.session,
    number: parsed.number,
    typeName: raw.TypeName,
    introNumber: parsed.introNumber,
    title: raw.Title,
    summary,
    summaryShort: summary,
    summarySource,
    explainer: {
      whatItDoes: summary,
      whoItAffects: "New Yorkers affected by this policy area.",
      whyItMatters: `This bill is currently in ${raw.StatusName}.`,
      whatHappensNext: raw.BodyName ? `The next major action is likely through ${raw.BodyName}.` : "The next major action depends on Council scheduling.",
    },
    statusName: raw.StatusName,
    statusBucket: mapStatusBucket(raw.StatusName),
    committee: raw.BodyName,
    introDate: normalizeDate(raw.IntroDate),
    actionDate: normalizeDate(raw.History?.at(-1)?.Date ?? raw.IntroDate),
    passedDate: normalizeDate(raw.PassedDate) || null,
    enactmentDate: normalizeDate(raw.EnactmentDate) || null,
    sponsorCount: sponsors.length,
    sponsors,
    leadSponsorSlug: sponsors.at(0)?.slug || null,
    timeline: toTimeline(raw.History),
    legistarUrl: raw.InSiteURL ?? "",
    transcriptUrl: null,
    updatedAt: raw.LastModified,
  };
}

export function parseCommitteeAssignments(person: RawPerson, sessionStart: string, sessionEnd: string): CommitteeAssignment[] {
  const records = person.OfficeRecords ?? [];

  return records
    .filter((record) => record.BodyName !== "City Council")
    .filter((record) => record.End >= sessionStart && record.Start <= sessionEnd)
    .map((record) => ({
      bodyId: record.BodyID,
      bodyName: record.BodyName,
      title: record.Title,
      isChair: /CHAIR/i.test(record.Title),
      start: record.Start,
      end: record.End,
    }))
    .sort((a, b) => Number(b.isChair) - Number(a.isChair) || a.bodyName.localeCompare(b.bodyName));
}

export function isSeatedCouncilMember(person: RawPerson, sessionStart: string, sessionEnd: string): boolean {
  if (!person.IsActive) {
    return false;
  }

  return (person.OfficeRecords ?? []).some(
    (record) =>
      record.BodyName === "City Council" &&
      /Council Member/i.test(record.Title) &&
      record.End >= sessionStart &&
      record.Start <= sessionEnd,
  );
}

const VOTE_VALUES = new Set(["Aye", "Nay", "Abstain", "Not Voting"]);

export function extractVoteRecords(event: RawEvent): Array<{
  matterFile: string;
  date: string;
  memberSlug: string;
  vote: "Aye" | "Nay" | "Abstain" | "Not Voting";
}> {
  const rows: Array<{ matterFile: string; date: string; memberSlug: string; vote: "Aye" | "Nay" | "Abstain" | "Not Voting" }> = [];

  for (const item of event.Items ?? []) {
    if (!item.MatterFile || item.RollCallFlag !== 1 || !item.RollCall?.length) {
      continue;
    }

    for (const vote of item.RollCall) {
      if (!vote.Slug || !vote.Value || !VOTE_VALUES.has(vote.Value)) {
        continue;
      }

      rows.push({
        matterFile: item.MatterFile,
        date: event.Date,
        memberSlug: vote.Slug,
        vote: vote.Value as "Aye" | "Nay" | "Abstain" | "Not Voting",
      });
    }
  }

  return rows;
}
