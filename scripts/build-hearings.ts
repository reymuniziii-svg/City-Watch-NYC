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

export async function buildHearings(): Promise<HearingRecord[]> {
  const hearings: HearingRecord[] = [];

  for (const year of SESSION_YEARS) {
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
      if (!isWithinNextDays(date, 30)) {
        continue;
      }

      const agendaItems = (raw.Items ?? [])
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

      hearings.push({
        eventId: raw.ID,
        bodyName: raw.BodyName,
        bodySlug: bodyToSlug(raw.BodyName),
        date,
        location: raw.Location || "TBD",
        videoUrl: raw.VideoPath ?? null,
        legistarUrl: raw.InSiteURL ?? null,
        testimonyUrl: raw.InSiteURL ?? null,
        agendaItems,
      });
    }
  }

  hearings.sort((a, b) => a.date.localeCompare(b.date));

  await writeJsonFile(path.join(PROCESSED_DIR, "hearings-upcoming.json"), hearings);
  await ensureDir(PUBLIC_DATA_DIR);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "hearings-upcoming.json"), hearings);

  console.log(`[build-hearings] wrote ${hearings.length} upcoming hearings`);
  return hearings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHearings().catch((error) => {
    console.error("[build-hearings] failed", error);
    process.exitCode = 1;
  });
}
