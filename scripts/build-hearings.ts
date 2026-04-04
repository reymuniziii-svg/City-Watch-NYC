import { promises as fs } from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR, RAW_UPSTREAM_DIR, SESSION_YEARS } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { parseMatterFile, type RawEvent } from "./lib/legislation";
import type { HearingRecord } from "../src/lib/types";

function bodyToSlug(bodyName: string): string {
  return bodyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanDate(dateString: string): string {
  return new Date(dateString).toISOString();
}

function isWithinNextDays(date: string, days: number): boolean {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) {
    return false;
  }

  const limit = days * 24 * 60 * 60 * 1000;
  return diffMs <= limit;
}

function isWithinPastDays(date: string, days: number): boolean {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  if (diffMs < 0) {
    return false;
  }

  const limit = days * 24 * 60 * 60 * 1000;
  return diffMs <= limit;
}

function buildAgendaItems(raw: RawEvent) {
  return (raw.Items ?? [])
    .filter((item) => Boolean(item.MatterFile))
    .map((item) => {
      const parsed = parseMatterFile(item.MatterFile!);
      return {
        matterFile: parsed.matterFile,
        billSession: parsed.billSession,
        billNumber: parsed.billNumber,
        billRoute: parsed.billRoute,
        title: item.Title ?? parsed.title,
      };
    });
}

export async function buildHearings(): Promise<HearingRecord[]> {
  const upcoming: HearingRecord[] = [];
  const past: HearingRecord[] = [];

  const yearsToScan = [SESSION_YEARS[0] - 1, ...SESSION_YEARS];

  for (const year of yearsToScan) {
    const yearDir = path.join(RAW_UPSTREAM_DIR, "events", String(year));
    let files: string[] = [];

    try {
      files = (await fs.readdir(yearDir)).filter((name) => name.endsWith(".json"));
    } catch {
      continue;
    }

    for (const file of files) {
      const raw = await readJsonFile<RawEvent>(path.join(yearDir, file));
      const date = cleanDate(raw.Date);

      const isUpcoming = isWithinNextDays(date, 30);
      const isPast = isWithinPastDays(date, 90);

      if (!isUpcoming && !isPast) {
        continue;
      }

      const agendaItems = buildAgendaItems(raw);
      const record: HearingRecord = {
        eventId: raw.ID,
        bodyName: raw.BodyName,
        bodySlug: bodyToSlug(raw.BodyName),
        date,
        location: raw.Location || "TBD",
        videoUrl: raw.VideoPath ?? null,
        legistarUrl: raw.InSiteURL ?? null,
        testimonyUrl: raw.InSiteURL ?? null,
        agendaItems,
      };

      if (isUpcoming) {
        upcoming.push(record);
      } else {
        past.push(record);
      }
    }
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  past.sort((a, b) => b.date.localeCompare(a.date));

  await ensureDir(PUBLIC_DATA_DIR);

  await writeJsonFile(path.join(PROCESSED_DIR, "hearings-upcoming.json"), upcoming);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "hearings-upcoming.json"), upcoming);

  await writeJsonFile(path.join(PROCESSED_DIR, "hearings-past.json"), past);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "hearings-past.json"), past);

  console.log(`[build-hearings] wrote ${upcoming.length} upcoming hearings and ${past.length} past hearings`);
  return upcoming;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHearings().catch((error) => {
    console.error("[build-hearings] failed", error);
    process.exitCode = 1;
  });
}
