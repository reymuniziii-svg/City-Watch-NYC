import { promises as fs } from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, SUMMARY_CACHE_FILE, PUBLIC_DATA_DIR } from "./lib/constants";
import { buildAiCacheNamespace, generateStructuredJson, resolveAiRuntimeConfig } from "./lib/ai";
import { ensureDir, fileExists, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { sha1 } from "./lib/hash";
import type { BillExplainer, BillRecord, SummaryCacheEntry, SummaryCacheFile } from "../src/lib/types";

function fallbackSummary(bill: BillRecord): string {
  const sponsorNote = bill.sponsorCount > 1 ? ` It currently has ${bill.sponsorCount} sponsors.` : "";
  return `${bill.introNumber} would ${bill.title.replace(/^A Local Law to /i, "").toLowerCase()}. It is currently in ${bill.statusName}.${sponsorNote}`;
}

function fallbackExplainer(bill: BillRecord): BillExplainer {
  return {
    whatItDoes: fallbackSummary(bill),
    whoItAffects: `People, agencies, or businesses touched by ${bill.committee || "this policy area"} in New York City.`,
    whyItMatters: bill.sponsorCount > 5 ? "The bill has attracted multiple sponsors, which can signal broader Council interest." : "The bill is part of the Council's current legislative agenda.",
    whatHappensNext: bill.committee ? `Watch for movement in ${bill.committee} or a future Council vote.` : "Watch for a hearing, committee action, or a future Council vote.",
  };
}

const BILL_EXPLAINER_SCHEMA = {
  type: "object",
  properties: {
    summaryShort: { type: "string" },
    whatItDoes: { type: "string" },
    whoItAffects: { type: "string" },
    whyItMatters: { type: "string" },
    whatHappensNext: { type: "string" },
  },
  required: ["summaryShort", "whatItDoes", "whoItAffects", "whyItMatters", "whatHappensNext"],
  additionalProperties: false,
} as const;

function cacheKey(bill: BillRecord, cacheNamespace: string): { key: string; titleHash: string } {
  const titleHash = sha1(bill.title.trim().toLowerCase());
  const key = `${cacheNamespace}::${bill.billId}::${bill.statusName}::${titleHash}`;
  return { key, titleHash };
}

async function listBillFiles(): Promise<string[]> {
  const root = path.join(PROCESSED_DIR, "bills");
  let years: string[] = [];

  try {
    years = await fs.readdir(root);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const year of years) {
    const yearDir = path.join(root, year);
    const stat = await fs.stat(yearDir);
    if (!stat.isDirectory()) {
      continue;
    }

    for (const file of await fs.readdir(yearDir)) {
      if (file.endsWith(".json")) {
        files.push(path.join(yearDir, file));
      }
    }
  }

  return files;
}

function normalizeExplainer(value: Partial<BillExplainer> | null | undefined, bill: BillRecord): BillExplainer {
  const fallback = fallbackExplainer(bill);

  return {
    whatItDoes: value?.whatItDoes?.trim() || fallback.whatItDoes,
    whoItAffects: value?.whoItAffects?.trim() || fallback.whoItAffects,
    whyItMatters: value?.whyItMatters?.trim() || fallback.whyItMatters,
    whatHappensNext: value?.whatHappensNext?.trim() || fallback.whatHappensNext,
  };
}

async function summarizeWithAi(
  bill: BillRecord,
): Promise<{ summaryShort: string; explainer: BillExplainer }> {
  const parsed = await generateStructuredJson<{
    summaryShort?: string;
    whatItDoes?: string;
    whoItAffects?: string;
    whyItMatters?: string;
    whatHappensNext?: string;
  }>({
    scope: "bill-explainer",
    systemInstruction:
      "You are a legislative analyst writing for everyday New Yorkers. Return compact JSON only. Use plain English, avoid legal jargon when possible, and be specific about what changes for city residents, workers, agencies, or businesses.",
    userPrompt: `Title: ${bill.title}
Intro: ${bill.introNumber}
Type: ${bill.typeName}
Status: ${bill.statusName}
Committee: ${bill.committee}
Sponsors: ${bill.sponsorCount}
Intro Date: ${bill.introDate}

Return JSON like:
{
  "summaryShort": "...",
  "whatItDoes": "...",
  "whoItAffects": "...",
  "whyItMatters": "...",
  "whatHappensNext": "..."
}`,
    responseJsonSchema: BILL_EXPLAINER_SCHEMA,
    maxOutputTokens: 500,
    temperature: 0,
  });

  if (!parsed) {
    return {
      summaryShort: fallbackSummary(bill),
      explainer: fallbackExplainer(bill),
    };
  }

  return {
    summaryShort: parsed.summaryShort?.trim() || fallbackSummary(bill),
    explainer: normalizeExplainer(parsed, bill),
  };
}

async function runWorkers<T>(items: T[], workerCount: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];

  const runners = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        return;
      }
      await worker(item);
    }
  });

  await Promise.all(runners);
}

export async function generateSummaries(): Promise<void> {
  const files = await listBillFiles();
  const cacheExists = await fileExists(SUMMARY_CACHE_FILE);
  const runtime = resolveAiRuntimeConfig();
  const cacheNamespace = buildAiCacheNamespace("bill-explainer");
  const cacheFile = cacheExists
    ? await readJsonFile<SummaryCacheFile>(SUMMARY_CACHE_FILE)
    : {
        generatedAt: new Date().toISOString(),
        entries: [] as SummaryCacheEntry[],
      };

  const cache = new Map(
    cacheFile.entries
      .filter((entry) => entry.key.startsWith(`${cacheNamespace}::`))
      .map((entry) => [entry.key, entry]),
  );
  const bills = await Promise.all(files.map((file) => readJsonFile<BillRecord>(file)));

  const summaryConcurrency = Number.parseInt(process.env.SUMMARY_CONCURRENCY ?? "5", 10);
  let processedCount = 0;

  await runWorkers(bills, Math.max(1, summaryConcurrency), async (bill) => {
    const { key, titleHash } = cacheKey(bill, cacheNamespace);
    const cached = cache.get(key);

    if (cached) {
      bill.summary = cached.summary;
      bill.summaryShort = cached.summary;
      bill.summarySource = "ai";
      bill.explainer = normalizeExplainer(cached.explainer, bill);
      cache.set(key, {
        ...cached,
        summary: bill.summaryShort,
        explainer: bill.explainer,
      });
      return;
    }

    try {
      if (runtime.provider !== "none") {
        const enriched = await summarizeWithAi(bill);
        bill.summary = enriched.summaryShort;
        bill.summaryShort = enriched.summaryShort;
        bill.explainer = enriched.explainer;
        bill.summarySource = "ai";
      } else {
        bill.summary = fallbackSummary(bill);
        bill.summaryShort = bill.summary;
        bill.explainer = fallbackExplainer(bill);
        bill.summarySource = "fallback";
      }
    } catch {
      bill.summary = fallbackSummary(bill);
      bill.summaryShort = bill.summary;
      bill.explainer = fallbackExplainer(bill);
      bill.summarySource = "fallback";
    }

    cache.set(key, {
      key,
      billId: bill.billId,
      statusName: bill.statusName,
      titleHash,
      summary: bill.summary,
      explainer: bill.explainer ?? fallbackExplainer(bill),
      updatedAt: new Date().toISOString(),
    });

    processedCount += 1;
    if (processedCount % 50 === 0 || processedCount === bills.length) {
      console.log(`[generate-summaries] ${processedCount}/${bills.length} bills processed`);
    }
  });

  for (let i = 0; i < files.length; i += 1) {
    await writeJsonFile(files[i], bills[i]);
  }

  const index = bills.map((bill) => ({
    billId: bill.billId,
    session: bill.session,
    number: bill.number,
    introNumber: bill.introNumber,
    title: bill.title,
    summary: bill.summaryShort,
    statusName: bill.statusName,
    statusBucket: bill.statusBucket,
    committee: bill.committee,
    actionDate: bill.actionDate,
    introDate: bill.introDate,
    sponsorCount: bill.sponsorCount,
    leadSponsorSlug: bill.leadSponsorSlug,
    route: `/bill/${bill.session}/${bill.number}`,
  }));

  await writeJsonFile(path.join(PROCESSED_DIR, "bills-index.json"), index);
  await ensureDir(PUBLIC_DATA_DIR);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "bills-index.json"), index);

  const updatedCache: SummaryCacheFile = {
    generatedAt: new Date().toISOString(),
    provider: runtime.provider,
    model: runtime.model,
    cacheNamespace,
    entries: Array.from(cache.values()),
  };

  await writeJsonFile(SUMMARY_CACHE_FILE, updatedCache);
  console.log(
    `[generate-summaries] processed ${bills.length} bills using ${runtime.provider}:${runtime.model}, cache size ${updatedCache.entries.length}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSummaries().catch((error) => {
    console.error("[generate-summaries] failed", error);
    process.exitCode = 1;
  });
}
