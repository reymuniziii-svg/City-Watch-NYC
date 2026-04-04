import { promises as fs } from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import { CITYMEETINGS_COUNCIL_URL, HEARING_CACHE_FILE, PROCESSED_DIR, RAW_UPSTREAM_DIR, SESSION_YEARS } from "./lib/constants";
import { buildAiCacheNamespace, generateStructuredJson, resolveAiRuntimeConfig } from "./lib/ai";
import { fileExists, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { parseMatterFile, type RawEvent } from "./lib/legislation";
import { sha1 } from "./lib/hash";
import { normalizeText } from "./lib/normalize";
import type { HearingQuote, HearingSummary, SourceContext } from "../src/lib/types";

interface CityMeetingsCard {
  eventDate: string;
  timeLabel: string;
  title: string;
  summary: string;
  url: string;
}

interface HearingCacheEntry {
  key: string;
  overview: string;
  takeaways: string[];
  outcomeType: HearingSummary["outcomeType"];
}

interface HearingCacheFile {
  generatedAt: string;
  provider?: string;
  model?: string;
  cacheNamespace?: string;
  entries: HearingCacheEntry[];
}

interface CityMeetingsChapter {
  title: string;
  summary: string;
  url: string;
}

interface QuoteCandidate extends HearingQuote {
  score: number;
  normalizedQuote: string;
}

function parseCityMeetingsDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function absoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `https://citymeetings.nyc${url}`;
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

function chapterRelevanceScore(chapter: CityMeetingsChapter): number {
  const combined = `${chapter.title} ${chapter.summary}`.toLowerCase();
  let score = 0;

  if (
    /invocation|opening remarks|welcome|call to order|adjourn|agenda|quorum|oath of office|spread the invocation|opening statement|introduction and overview/.test(
      combined,
    )
  ) {
    score -= 60;
  }

  if (/vote|budget|funding|cut|increase|oversight|testimony|federal|cost|shelter|housing|safety|school|nypd|agency|department|program|services|reentry|summons/.test(combined)) {
    score += 28;
  }

  if (/question|critic|warn|oppose|support|press|request|call for|demand|urge|concern/.test(combined)) {
    score += 18;
  }

  if (chapter.summary.length >= 80) {
    score += 6;
  }

  return score;
}

function sentenceRelevanceScore(sentence: string, chapter: CityMeetingsChapter, speaker: string): number {
  const normalized = sentence.trim().replace(/\s+/g, " ");
  const combined = `${chapter.title} ${chapter.summary} ${normalized}`.toLowerCase();
  let score = chapterRelevanceScore(chapter);

  if (normalized.length < 80) {
    score -= 25;
  } else if (normalized.length <= 320) {
    score += 12;
  } else if (normalized.length <= 420) {
    score += 4;
  } else {
    score -= 8;
  }

  if (/^good (morning|afternoon|evening)|^thank you|welcome to|honor and a privilege|i would like to thank|spread the invocation|call this hearing to order|open(?:ing)? remarks/.test(combined)) {
    score -= 55;
  }

  if (/\$|\b\d+(?:,\d{3})*(?:\.\d+)?\b|percent|million|billion|thousand/.test(combined)) {
    score += 10;
  }

  if (/budget|funding|cost|rent|housing|tenant|safety|school|student|worker|program|service|agency|department|policy|oversight|testimony|federal|asylum|voucher|parks|childcare|police|nypd|legal service|ems/.test(combined)) {
    score += 18;
  }

  if (/need to|must|cannot|can't|should|because|impact|affect|crisis|shortfall|delay|problem|challenge|priority|failure/.test(combined)) {
    score += 10;
  }

  if (speaker === "Meeting record") {
    score -= 5;
  }

  return score;
}

async function selectRelevantQuotes(chapters: CityMeetingsChapter[]): Promise<HearingQuote[]> {
  const rankedChapters = chapters
    .map((chapter) => ({
      chapter,
      score: chapterRelevanceScore(chapter),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.chapter);

  const candidates: QuoteCandidate[] = [];

  for (const chapter of rankedChapters) {
    const chapterHtml = await fetchHtml(chapter.url);
    const chapterPage = load(chapterHtml);
    const speaker = extractSpeakerFromTitle(chapter.title);
    const bestSentence = chapterPage(".sentence")
      .toArray()
      .map((element) => chapterPage(element).text().trim().replace(/\s+/g, " "))
      .filter((value) => value.length >= 50)
      .map((quote) => ({
        quote,
        score: sentenceRelevanceScore(quote, chapter, speaker),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!bestSentence || bestSentence.score < 5) {
      continue;
    }

    candidates.push({
      speaker,
      quote: bestSentence.quote,
      chapterTitle: chapter.title,
      chapterUrl: chapter.url,
      score: bestSentence.score,
      normalizedQuote: normalizeText(bestSentence.quote),
    });
  }

  const selected: QuoteCandidate[] = [];
  const seenQuotes = new Set<string>();
  const seenSpeakers = new Set<string>();

  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (seenQuotes.has(candidate.normalizedQuote)) {
      continue;
    }

    const isGenericSpeaker = candidate.speaker === "Meeting record";
    if (!isGenericSpeaker && seenSpeakers.has(candidate.speaker)) {
      continue;
    }

    if (isGenericSpeaker && selected.some((quote) => quote.speaker === "Meeting record")) {
      continue;
    }

    selected.push(candidate);
    seenQuotes.add(candidate.normalizedQuote);
    if (!isGenericSpeaker) {
      seenSpeakers.add(candidate.speaker);
    }

    if (selected.length === 4) {
      break;
    }
  }

  return selected.map((candidate) => ({
    speaker: candidate.speaker,
    quote: candidate.quote,
    chapterTitle: candidate.chapterTitle,
    chapterUrl: candidate.chapterUrl,
  }));
}

function detectOutcomeType(summary: string, takeaways: string[]): HearingSummary["outcomeType"] {
  const combined = `${summary} ${takeaways.join(" ")}`.toLowerCase();

  if (/vote|passes|passed|adopted|approved/.test(combined)) {
    return "action";
  }

  if (/oversight|questioned|pressed|scrutinized/.test(combined)) {
    return "oversight";
  }

  if (/testimony|testified|public comment/.test(combined)) {
    return "testimony";
  }

  if (/hearing|discussion|discussed/.test(combined)) {
    return "mixed";
  }

  return "unknown";
}

function buildFallbackTakeaways(card: CityMeetingsCard, chapterTitles: string[]): string[] {
  const values = [card.summary, ...chapterTitles.map((title) => title.replace(/^Vote outcome on /i, "Vote on "))].filter(Boolean);
  return values.slice(0, 3);
}

function normalizeBodyName(value: string): string {
  return normalizeText(
    value
      .replace(/\bcommittee on\b/gi, "")
      .replace(/\bsubcommittee on\b/gi, "")
      .replace(/\band\b/gi, " ")
      .replace(/&/g, " ")
      .replace(/\bstandards and ethics\b/gi, "")
      .replace(/\binternational relations\b/gi, "international")
      .replace(/\bintergroup relations\b/gi, "international")
      .replace(/\bsubstance use\b/gi, "addiction")
      .replace(/\bmental health and addiction\b/gi, "mental health addiction")
      .replace(/\bmental health disabilities and addiction\b/gi, "mental health addiction")
      .replace(/\bwaterfronts\b/gi, "waterfront")
      .replace(/\bresiliency\b/gi, "resiliency"),
  );
}

function toTokenSet(value: string): Set<string> {
  return new Set(normalizeBodyName(value).split(" ").filter((token) => token.length > 2));
}

function intersectionSize(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const token of left) {
    if (right.has(token)) {
      count += 1;
    }
  }
  return count;
}

function parseTimeLabelToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = Number.parseInt(match[1], 10) % 12;
  const minutes = Number.parseInt(match[2], 10);
  const suffix = match[3].toUpperCase();
  if (suffix === "PM") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function eventMinutes(value: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
}

async function fetchCouncilCards(): Promise<CityMeetingsCard[]> {
  const response = await fetch(`${CITYMEETINGS_COUNCIL_URL}filter-meetings/`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-requested-with": "XMLHttpRequest",
    },
    body: new URLSearchParams({
      "tag-HEARING": "HEARING",
      "tag-VOTE": "VOTE",
      "tag-STATED MEETING": "STATED MEETING",
      "tag-LAND USE": "LAND USE",
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${CITYMEETINGS_COUNCIL_URL}filter-meetings/: ${response.status}`);
  }
  const html = await response.text();
  const $ = load(html);
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  return $("div.flex.flex-col.p-6.rounded-md")
    .toArray()
    .map((element) => {
      const card = $(element);
      const metaParts = card
        .find("div.flex.flex-row.items-center.gap-1.text-gray-700.font-semibold p")
        .toArray()
        .map((part) => $(part).text().trim())
        .filter(Boolean);
      const dateText = metaParts[0] ?? "";
      const timeLabel = metaParts.at(-1) ?? "";
      const title = card.find("h4").first().text().trim();
      const summary = card.find("div.markdown").first().text().trim().replace(/\s+/g, " ");
      const url = absoluteUrl(card.find("a[href*='/meetings/new-york-city-council/']").first().attr("href") ?? "");

      return {
        eventDate: parseCityMeetingsDate(dateText),
        timeLabel,
        title,
        summary,
        url,
      };
    })
    .filter((card) => card.url.length > 0 && card.eventDate.length > 0)
    .filter((card) => new Date(card.eventDate).getTime() >= oneYearAgo.getTime());
}

async function loadRawEvents(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  for (const year of [SESSION_YEARS[0] - 1, ...SESSION_YEARS]) {
    const eventsDir = path.join(RAW_UPSTREAM_DIR, "events", String(year));
    let files: string[] = [];

    try {
      files = (await fs.readdir(eventsDir)).filter((name) => name.endsWith(".json"));
    } catch {
      continue;
    }

    for (const file of files) {
      events.push(await readJsonFile<RawEvent>(path.join(eventsDir, file)));
    }
  }

  return events;
}

function sameDay(left: string, right: string): boolean {
  return left.slice(0, 10) === right.slice(0, 10);
}

function matchEvent(card: CityMeetingsCard, events: RawEvent[]): RawEvent | null {
  const normalizedTitle = normalizeBodyName(card.title);
  const cardTokens = toTokenSet(card.title);
  const cardMinutes = parseTimeLabelToMinutes(card.timeLabel);
  let bestMatch: { event: RawEvent; score: number } | null = null;

  for (const event of events) {
    const eventDate = new Date(event.Date).toISOString();
    if (!sameDay(card.eventDate, eventDate)) {
      continue;
    }

    const normalizedBody = normalizeBodyName(event.BodyName);
    if (normalizedTitle === "stated meeting" && normalizedBody === "city council") {
      return event;
    }

    const eventTokens = toTokenSet(event.BodyName);
    const overlap = intersectionSize(cardTokens, eventTokens);
    if (overlap === 0) {
      continue;
    }

    let score = overlap * 10;
    if (normalizedBody === normalizedTitle) {
      score += 50;
    }

    const unionSize = new Set([...cardTokens, ...eventTokens]).size;
    const overlapRatio = unionSize > 0 ? overlap / unionSize : 0;
    score += Math.round(overlapRatio * 20);

    const minutes = eventMinutes(event.Date);
    if (cardMinutes !== null && minutes !== null) {
      const diff = Math.abs(cardMinutes - minutes);
      if (diff <= 15) {
        score += 20;
      } else if (diff <= 60) {
        score += 10;
      } else if (diff <= 180) {
        score += 3;
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { event, score };
    }
  }

  return bestMatch?.score && bestMatch.score >= 18 ? bestMatch.event : null;
}

const HEARING_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    takeaways: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
    },
    outcomeType: {
      type: "string",
      enum: ["action", "oversight", "testimony", "mixed", "unknown"],
    },
  },
  required: ["overview", "takeaways", "outcomeType"],
  additionalProperties: false,
} as const;

async function summarizeWithAi(
  card: CityMeetingsCard,
  chapterTitles: string[],
): Promise<{ overview: string; takeaways: string[]; outcomeType: HearingSummary["outcomeType"] }> {
  const parsed = await generateStructuredJson<{
    overview?: string;
    takeaways?: string[];
    outcomeType?: HearingSummary["outcomeType"];
  }>({
    scope: "hearing-summary",
    systemInstruction:
      "You rewrite civic meeting summaries for everyday New Yorkers. Return compact JSON only with keys overview, takeaways, outcomeType. outcomeType must be one of action, oversight, testimony, mixed, unknown.",
    userPrompt: `Meeting: ${card.title}
Date: ${card.eventDate}
Summary: ${card.summary}
Chapter titles:
${chapterTitles.slice(0, 12).map((title) => `- ${title}`).join("\n")}`,
    responseJsonSchema: HEARING_SUMMARY_SCHEMA,
    maxOutputTokens: 450,
    temperature: 0,
  });

  if (!parsed) {
    const fallbackTakeaways = buildFallbackTakeaways(card, chapterTitles);
    return {
      overview: card.summary,
      takeaways: fallbackTakeaways,
      outcomeType: detectOutcomeType(card.summary, fallbackTakeaways),
    };
  }

  const takeaways = (parsed.takeaways ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 4);

  return {
    overview: parsed.overview?.trim() || card.summary,
    takeaways: takeaways.length > 0 ? takeaways : buildFallbackTakeaways(card, chapterTitles),
    outcomeType: parsed.outcomeType && ["action", "oversight", "testimony", "mixed", "unknown"].includes(parsed.outcomeType)
      ? parsed.outcomeType
      : detectOutcomeType(card.summary, takeaways),
  };
}

export async function buildHearingEnrichment(): Promise<HearingSummary[]> {
  const cards = await fetchCouncilCards();
  const rawEvents = await loadRawEvents();
  const cacheExists = await fileExists(HEARING_CACHE_FILE);
  const runtime = resolveAiRuntimeConfig();
  const cacheNamespace = buildAiCacheNamespace("hearing-summary");
  const cacheFile = cacheExists
    ? await readJsonFile<HearingCacheFile>(HEARING_CACHE_FILE)
    : { generatedAt: new Date().toISOString(), entries: [] };
  const cache = new Map(
    cacheFile.entries
      .filter((entry) => entry.key.startsWith(`${cacheNamespace}::`))
      .map((entry) => [entry.key, entry]),
  );
  let processedCount = 0;

  const hearingSummaries = await runWorkers(cards, 4, async (card) => {
    const event = matchEvent(card, rawEvents);
    if (!event) {
      return null;
    }

    const detailHtml = await fetchHtml(card.url);
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

    const cacheKey = `${cacheNamespace}::${sha1(`${card.url}:${card.summary}:${chapterCards.map((chapter) => chapter.title).join("|")}`)}`;
    let normalized = cache.get(cacheKey);
    if (!normalized) {
      const fallbackTakeaways = buildFallbackTakeaways(card, chapterCards.map((chapter) => chapter.title));
      if (runtime.provider !== "none") {
        try {
          const aiSummary = await summarizeWithAi(card, chapterCards.map((chapter) => chapter.title));
          normalized = {
            key: cacheKey,
            overview: aiSummary.overview,
            takeaways: aiSummary.takeaways,
            outcomeType: aiSummary.outcomeType,
          };
        } catch {
          normalized = {
            key: cacheKey,
            overview: card.summary,
            takeaways: fallbackTakeaways,
            outcomeType: detectOutcomeType(card.summary, fallbackTakeaways),
          };
        }
      } else {
        normalized = {
          key: cacheKey,
          overview: card.summary,
          takeaways: fallbackTakeaways,
          outcomeType: detectOutcomeType(card.summary, fallbackTakeaways),
        };
      }

      cache.set(cacheKey, normalized);
    }

    const quotes = await selectRelevantQuotes(chapterCards);

    const sourceContext: SourceContext = {
      inputFields: [
        { label: "Meeting", value: card.title },
        { label: "Date", value: card.eventDate },
        { label: "CityMeetings Summary", value: card.summary },
        { label: "Chapter Titles", value: chapterCards.map((c) => c.title).slice(0, 12).join("; ") },
      ],
      sourceLabel: "CityMeetings NYC",
      sourceUrl: card.url,
      generatedAt: new Date().toISOString(),
      model: runtime.provider !== "none" ? runtime.model : "fallback",
    };

    const hearingSummary = {
      id: `${event.ID}-${normalizeText(card.title)}`,
      eventDate: new Date(event.Date).toISOString(),
      bodyName: event.BodyName,
      title: card.title,
      cityMeetingsUrl: card.url,
      sourceLabel: "CityMeetings NYC",
      overview: normalized.overview,
      takeaways: normalized.takeaways.slice(0, 4),
      quotes: quotes.slice(0, 4),
      discussedBills: (event.Items ?? [])
        .filter((item) => Boolean(item.MatterFile))
        .map((item) => parseMatterFile(item.MatterFile!)),
      outcomeType: normalized.outcomeType,
      matchedBy: "body-and-date",
      sourceContext,
    } satisfies HearingSummary;

    processedCount += 1;
    if (processedCount % 10 === 0 || processedCount === cards.length) {
      console.log(`[build-hearing-enrichment] ${processedCount}/${cards.length} hearing cards processed`);
    }

    return hearingSummary;
  });

  const output = hearingSummaries.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  await writeJsonFile(path.join(PROCESSED_DIR, "hearing-enrichment.json"), output);
  await writeJsonFile(HEARING_CACHE_FILE, {
    generatedAt: new Date().toISOString(),
    provider: runtime.provider,
    model: runtime.model,
    cacheNamespace,
    entries: Array.from(cache.values()),
  });

  console.log(`[build-hearing-enrichment] wrote ${output.length} hearing summaries using ${runtime.provider}:${runtime.model}`);
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHearingEnrichment().catch((error) => {
    console.error("[build-hearing-enrichment] failed", error);
    process.exitCode = 1;
  });
}
