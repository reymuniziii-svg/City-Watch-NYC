import path from "node:path";
import { load } from "cheerio";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile, fileExists } from "./lib/fs-utils";
import type { HearingSummary } from "../src/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscriptChunk {
  speaker: string;
  text: string;
  timestamp?: string;
  chapterTitle: string;
  chapterUrl: string;
}

interface TranscriptDocument {
  eventId: number;
  bodyName: string;
  date: string;
  chunks: TranscriptChunk[];
}

interface TranscriptSearchEntry {
  eventId: number;
  bodyName: string;
  date: string;
  speaker: string;
  excerpt: string;
  chapterUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function absoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `https://citymeetings.nyc${url}`;
}

function extractSpeakerFromTitle(title: string): string {
  const possessiveMatch = title.match(/^(.+?)'s\s/i);
  if (possessiveMatch) {
    return possessiveMatch[1].trim();
  }

  const verbs = [
    " addresses ",
    " administers ",
    " introduces ",
    " explains ",
    " nominates ",
    " seconds ",
    " reflects ",
    " discusses ",
    " acknowledges ",
    " outlines ",
    " shares ",
    " expresses ",
    " announces ",
    " moves ",
    " delivers ",
    " adjourns ",
    " passes ",
    " adopted ",
  ];

  const lower = title.toLowerCase();
  for (const verb of verbs) {
    const index = lower.indexOf(verb);
    if (index > 0) {
      return title.slice(0, index).trim();
    }
  }

  return "Meeting record";
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return response.text();
}

async function runWorkers<T, R>(items: T[], workerCount: number, worker: (item: T) => Promise<R | null>): Promise<R[]> {
  const queue = [...items];
  const results: R[] = [];

  const runners = Array.from({ length: Math.max(1, workerCount) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        return;
      }

      const value = await worker(item);
      if (value) {
        results.push(value);
      }
    }
  });

  await Promise.all(runners);
  return results;
}

function parseEventId(hearingId: string): number | null {
  const match = hearingId.match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}\u2026`;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

interface CityMeetingsChapter {
  title: string;
  summary: string;
  url: string;
}

async function processHearing(hearing: HearingSummary): Promise<TranscriptDocument | null> {
  const eventId = parseEventId(hearing.id);
  if (eventId === null) {
    console.warn(`[build-transcript-index] skipping hearing with unparseable id: ${hearing.id}`);
    return null;
  }

  const detailHtml = await fetchHtml(hearing.cityMeetingsUrl);
  const $ = load(detailHtml);

  const chapterCards: CityMeetingsChapter[] = $("a[href*='/chapter/']")
    .toArray()
    .map((element) => {
      const anchor = $(element);
      return {
        title: anchor.find("h3").first().text().trim(),
        summary: anchor.find("p.text-gray-600").first().text().trim().replace(/\s+/g, " "),
        url: absoluteUrl(anchor.attr("href") ?? ""),
      };
    })
    .filter((chapter) => chapter.title.length > 0);

  if (chapterCards.length === 0) {
    console.warn(`[build-transcript-index] no chapters found for hearing ${hearing.id}`);
    return null;
  }

  const chunks: TranscriptChunk[] = [];

  for (const chapter of chapterCards) {
    try {
      const chapterHtml = await fetchHtml(chapter.url);
      const chapterPage = load(chapterHtml);
      const speaker = extractSpeakerFromTitle(chapter.title);

      const sentences = chapterPage(".sentence")
        .toArray()
        .map((element) => chapterPage(element).text().trim().replace(/\s+/g, " "))
        .filter((text) => text.length > 0);

      if (sentences.length > 0) {
        chunks.push({
          speaker,
          text: sentences.join(" "),
          chapterTitle: chapter.title,
          chapterUrl: chapter.url,
        });
      }
    } catch (error) {
      console.warn(`[build-transcript-index] failed to fetch chapter ${chapter.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (chunks.length === 0) {
    return null;
  }

  return {
    eventId,
    bodyName: hearing.bodyName,
    date: hearing.eventDate,
    chunks,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function buildTranscriptIndex(): Promise<void> {
  const enrichmentPath = path.join(PROCESSED_DIR, "hearing-enrichment.json");
  const transcriptsDir = path.join(PROCESSED_DIR, "transcripts");
  const searchIndexPath = path.join(PUBLIC_DATA_DIR, "transcript-search-index.json");

  if (!(await fileExists(enrichmentPath))) {
    console.warn("[build-transcript-index] hearing-enrichment.json not found, skipping");
    return;
  }

  const hearings = await readJsonFile<HearingSummary[]>(enrichmentPath);
  const eligible = hearings.filter((hearing) => hearing.cityMeetingsUrl && hearing.cityMeetingsUrl.length > 0);

  if (eligible.length === 0) {
    console.log("[build-transcript-index] no hearings with cityMeetingsUrl, skipping");
    return;
  }

  console.log(`[build-transcript-index] processing ${eligible.length} hearings`);
  await ensureDir(transcriptsDir);

  let processedCount = 0;

  const documents = await runWorkers(eligible, 3, async (hearing) => {
    try {
      const doc = await processHearing(hearing);
      processedCount += 1;
      if (processedCount % 10 === 0 || processedCount === eligible.length) {
        console.log(`[build-transcript-index] ${processedCount}/${eligible.length} hearings processed`);
      }
      return doc;
    } catch (error) {
      processedCount += 1;
      console.warn(
        `[build-transcript-index] failed to process hearing ${hearing.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  });

  // Save per-hearing transcript files
  for (const doc of documents) {
    await writeJsonFile(path.join(transcriptsDir, `${doc.eventId}.json`), doc);
  }

  // Build compact search index for Fuse.js
  const searchIndex: TranscriptSearchEntry[] = [];

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      searchIndex.push({
        eventId: doc.eventId,
        bodyName: doc.bodyName,
        date: doc.date,
        speaker: chunk.speaker,
        excerpt: truncate(chunk.text, 200),
        chapterUrl: chunk.chapterUrl,
      });
    }
  }

  await ensureDir(PUBLIC_DATA_DIR);
  await writeJsonFile(searchIndexPath, searchIndex);

  console.log(
    `[build-transcript-index] wrote ${documents.length} transcript files and ${searchIndex.length} search entries`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildTranscriptIndex().catch((error) => {
    console.error("[build-transcript-index] failed", error);
    process.exitCode = 1;
  });
}
